package application

import (
	"errors"
	"fmt"
	"math"
	"strings"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

// TransitionType represents the type of floor transition
type TransitionType int

const (
	TransitionNone TransitionType = iota
	TransitionStairs
	TransitionElevator
)

func (t TransitionType) String() string {
	switch t {
	case TransitionStairs:
		return "stairs"
	case TransitionElevator:
		return "elevator"
	default:
		return "none"
	}
}

// TurnDirection represents a turn instruction
type TurnDirection string

const (
	TurnLeft     TurnDirection = "left"
	TurnRight    TurnDirection = "right"
	TurnStraight TurnDirection = "straight"
)

// StraightTurnThreshold is the cosine threshold for considering a turn as "straight" (cos 15°)
const StraightTurnThreshold = 0.966

type FloorRepo interface {
	GetBuildingFloors(code string) ([]domain.Floor, error)
}

type IndoorRoomRepo interface {
	GetByBuilding(buildingCode string) ([]domain.IndoorRoom, error)
}

type IndoorPathService struct {
	floors FloorRepo
	rooms  IndoorRoomRepo
}

func NewIndoorPathService(floors FloorRepo, rooms IndoorRoomRepo) *IndoorPathService {
	return &IndoorPathService{floors: floors, rooms: rooms}
}

type IndoorPathRequest struct {
	BuildingCode string `json:"buildingCode"`
	FloorNumber  int    `json:"floorNumber"`

	StartVertex *int `json:"startVertex"`
	EndVertex   *int `json:"endVertex"`

	StartCoord *domain.Coordinates `json:"start"`
	EndCoord   *domain.Coordinates `json:"end"`

	StartRoom string `json:"startRoom"`
	EndRoom   string `json:"endRoom"`

	RequireAccessible bool `json:"requireAccessible"` // filter out inaccessible edges
}

// MultiFloorPathRequest for pathfinding across different floors in same building
type MultiFloorPathRequest struct {
	BuildingCode      string              `json:"buildingCode"`
	StartFloor        int                 `json:"startFloor"`
	EndFloor          int                 `json:"endFloor"`
	StartCoord        *domain.Coordinates `json:"start"`
	EndCoord          *domain.Coordinates `json:"end"`
	StartRoom         string              `json:"startRoom"`
	EndRoom           string              `json:"endRoom"`
	PreferElevator    bool                `json:"preferElevator"`
	RequireAccessible bool                `json:"requireAccessible"` // filter out inaccessible edges
}

// FloorSegment represents a path segment on a single floor
type FloorSegment struct {
	FloorNumber int                  `json:"floorNumber"`
	FloorName   string               `json:"floorName"`
	Path        []domain.Coordinates `json:"path"`
	Distance    float64              `json:"distance"`
	Directions  []TurnDirection      `json:"directions"`
}

// MultiFloorPathResult contains path across multiple floors
type MultiFloorPathResult struct {
	Segments       []FloorSegment `json:"segments"`
	TotalDistance  float64        `json:"totalDistance"`
	TransitionType TransitionType `json:"transitionType"`
}

type IndoorPathResult struct {
	Path       []domain.Coordinates `json:"path"`
	Distance   float64              `json:"distance"`
	Directions []TurnDirection      `json:"directions"`
}

func (s *IndoorPathService) ShortestPath(req IndoorPathRequest) (*IndoorPathResult, error) {
	if strings.TrimSpace(req.BuildingCode) == "" {
		return nil, errors.New("buildingCode is required")
	}

	floors, err := s.floors.GetBuildingFloors(req.BuildingCode)
	if err != nil {
		return nil, err
	}

	var floor *domain.Floor
	for i := range floors {
		if floors[i].FloorNumber == req.FloorNumber {
			floor = &floors[i]
			break
		}
	}
	if floor == nil {
		return nil, errors.New("floor not found for building")
	}

	g, err := newGraphFromFloor(*floor, req.RequireAccessible)
	if err != nil {
		return nil, err
	}

	startIdx, endIdx, err := s.resolveEndpoints(req, g, floor, req.BuildingCode, req.FloorNumber)
	if err != nil {
		return nil, err
	}

	vertexPath, dist, err := g.shortestPath(startIdx, endIdx)
	if err != nil {
		return nil, err
	}

	pathCoords := g.pathCoordinates(vertexPath)
	return &IndoorPathResult{
		Path:       pathCoords,
		Distance:   dist,
		Directions: calculateTurnDirections(pathCoords),
	}, nil
}

// MultiFloorShortestPath calculates shortest path from (x,y) on one floor to (x,y) on another floor
func (s *IndoorPathService) MultiFloorShortestPath(req MultiFloorPathRequest) (*MultiFloorPathResult, error) {
	if strings.TrimSpace(req.BuildingCode) == "" {
		return nil, errors.New("buildingCode is required")
	}
	if req.StartCoord == nil && req.StartRoom == "" {
		return nil, errors.New("start coordinate or startRoom is required")
	}
	if req.EndCoord == nil && req.EndRoom == "" {
		//return nil, errors.New("end coordinate or endRoom is required")
		return nil, fmt.Errorf("end coordinate or endRoom is required for building %s floor %d", req.BuildingCode, req.EndFloor)
	}

	floors, err := s.floors.GetBuildingFloors(req.BuildingCode)
	if err != nil {
		return nil, err
	}

	// Get start and end floors
	var startFloor, endFloor *domain.Floor
	for i := range floors {
		if floors[i].FloorNumber == req.StartFloor {
			startFloor = &floors[i]
		}
		if floors[i].FloorNumber == req.EndFloor {
			endFloor = &floors[i]
		}
	}
	if startFloor == nil {
		return nil, errors.New("start floor not found")
	}
	if endFloor == nil {
		return nil, errors.New("end floor not found")
	}

	// Handle same-floor navigation (no transition needed)
	if req.StartFloor == req.EndFloor {
		return s.sameFloorPath(req, startFloor)
	}

	// Resolve start and end points
	startPoint, err := s.resolveCoordinate(req.StartCoord, req.BuildingCode, req.StartFloor, req.StartRoom)
	if err != nil {
		return nil, err
	}
	endPoint, err := s.resolveCoordinate(req.EndCoord, req.BuildingCode, req.EndFloor, req.EndRoom)
	if err != nil {
		return nil, err
	}

	// Find transition points (stairs/elevator) on both floors using enum
	preferredType := TransitionStairs
	if req.PreferElevator || req.RequireAccessible {
		preferredType = TransitionElevator
	}

	// When accessibility required, only allow elevator (no stairs fallback)
	var transitionType TransitionType
	var startTransition, endTransition *domain.Coordinates
	if req.RequireAccessible {
		startTransition = s.findClosestTransitionPoint(startFloor, TransitionElevator, startPoint)
		endTransition = s.findClosestTransitionPoint(endFloor, TransitionElevator, endPoint)
		if startTransition != nil && endTransition != nil {
			transitionType = TransitionElevator
		}
	} else {
		transitionType, startTransition, endTransition = s.findBestTransitions(
			startFloor, endFloor, startPoint, endPoint, preferredType,
		)
	}

	if startTransition == nil || endTransition == nil {
		return nil, errors.New("no transition point (stairs/elevator) found on floor")
	}

	// Calculate path on start floor: from start point to transition
	startGraph, err := newGraphFromFloor(*startFloor, req.RequireAccessible)
	if err != nil {
		return nil, err
	}

	startIdx := startGraph.nearestVertexWithSplit(startPoint)
	transitionStartIdx := startGraph.nearestVertexWithSplit(*startTransition)

	pathToTransition, distToTransition, err := startGraph.shortestPath(startIdx, transitionStartIdx)
	if err != nil {
		return nil, errors.New("no path to transition point on start floor")
	}

	// Calculate path on end floor: from transition to end point
	endGraph, err := newGraphFromFloor(*endFloor, req.RequireAccessible)
	if err != nil {
		return nil, err
	}

	transitionEndIdx := endGraph.nearestVertexWithSplit(*endTransition)
	endIdx := endGraph.nearestVertexWithSplit(endPoint)

	pathFromTransition, distFromTransition, err := endGraph.shortestPath(transitionEndIdx, endIdx)
	if err != nil {
		return nil, errors.New("no path from transition point on end floor")
	}

	// Build result with floor segments
	pathToTransitionCoords := startGraph.pathCoordinates(pathToTransition)
	pathFromTransitionCoords := endGraph.pathCoordinates(pathFromTransition)

	segments := []FloorSegment{
		{
			FloorNumber: req.StartFloor,
			FloorName:   startFloor.FloorName,
			Path:        pathToTransitionCoords,
			Distance:    distToTransition,
			Directions:  calculateTurnDirections(pathToTransitionCoords),
		},
		{
			FloorNumber: req.EndFloor,
			FloorName:   endFloor.FloorName,
			Path:        pathFromTransitionCoords,
			Distance:    distFromTransition,
			Directions:  calculateTurnDirections(pathFromTransitionCoords),
		},
	}

	return &MultiFloorPathResult{
		Segments:       segments,
		TotalDistance:  distToTransition + distFromTransition,
		TransitionType: transitionType,
	}, nil
}

// resolveCoordinate resolves a coordinate from either a direct coord or a room name
func (s *IndoorPathService) resolveCoordinate(coord *domain.Coordinates, building string, floorNum int, room string) (domain.Coordinates, error) {
	if coord != nil {
		return *coord, nil
	}
	c, err := s.roomCentroid(building, floorNum, room)
	if err != nil {
		return domain.Coordinates{}, err
	}
	return *c, nil
}

// sameFloorPath handles navigation when start and end are on the same floor
func (s *IndoorPathService) sameFloorPath(req MultiFloorPathRequest, floor *domain.Floor) (*MultiFloorPathResult, error) {
	g, err := newGraphFromFloor(*floor, req.RequireAccessible)
	if err != nil {
		return nil, err
	}

	// Resolve start and end points
	startPoint, err := s.resolveCoordinate(req.StartCoord, req.BuildingCode, req.StartFloor, req.StartRoom)
	if err != nil {
		return nil, err
	}
	endPoint, err := s.resolveCoordinate(req.EndCoord, req.BuildingCode, req.EndFloor, req.EndRoom)
	if err != nil {
		return nil, err
	}

	startIdx := g.nearestVertexWithSplit(startPoint)
	endIdx := g.nearestVertexWithSplit(endPoint)

	vertexPath, dist, err := g.shortestPath(startIdx, endIdx)
	if err != nil {
		return nil, err
	}

	pathCoords := g.pathCoordinates(vertexPath)
	segments := []FloorSegment{
		{
			FloorNumber: req.StartFloor,
			FloorName:   floor.FloorName,
			Path:        pathCoords,
			Distance:    dist,
			Directions:  calculateTurnDirections(pathCoords),
		},
	}

	return &MultiFloorPathResult{
		Segments:       segments,
		TotalDistance:  dist,
		TransitionType: TransitionNone,
	}, nil
}

// findBestTransitions finds the best transition points on both floors, with fallback logic
func (s *IndoorPathService) findBestTransitions(
	startFloor, endFloor *domain.Floor,
	startPoint, endPoint domain.Coordinates,
	preferred TransitionType,
) (TransitionType, *domain.Coordinates, *domain.Coordinates) {
	// Try preferred type first
	typesToTry := []TransitionType{preferred}
	// Add fallback types
	if preferred == TransitionStairs {
		typesToTry = append(typesToTry, TransitionElevator)
	} else {
		typesToTry = append(typesToTry, TransitionStairs)
	}

	for _, tt := range typesToTry {
		startTrans := s.findClosestTransitionPoint(startFloor, tt, startPoint)
		endTrans := s.findClosestTransitionPoint(endFloor, tt, endPoint)
		if startTrans != nil && endTrans != nil {
			return tt, startTrans, endTrans
		}
	}

	return TransitionNone, nil, nil
}

// findClosestTransitionPoint finds the transition point of given type closest to the reference coordinate
func (s *IndoorPathService) findClosestTransitionPoint(floor *domain.Floor, transType TransitionType, refCoord domain.Coordinates) *domain.Coordinates {
	typeStr := transType.String()
	if typeStr == "none" {
		return nil
	}

	var closest *domain.Coordinates
	minDist := math.MaxFloat64

	for _, poi := range floor.POIs {
		if !strings.EqualFold(poi.Type, typeStr) && !strings.Contains(strings.ToLower(poi.Type), typeStr) {
			continue
		}
		d := euclid(poi.Position, refCoord)
		if d < minDist {
			minDist = d
			pos := poi.Position
			closest = &pos
		}
	}
	return closest
}

// findTransitionPoint finds stairs or elevator POI on a floor (legacy, finds first match)
func (s *IndoorPathService) findTransitionPoint(floor *domain.Floor, poiType string) *domain.Coordinates {
	for _, poi := range floor.POIs {
		if strings.EqualFold(poi.Type, poiType) || strings.Contains(strings.ToLower(poi.Type), poiType) {
			return &poi.Position
		}
	}
	return nil
}

func (s *IndoorPathService) resolveEndpoints(req IndoorPathRequest, g *graph, floor *domain.Floor, building string, floorNum int) (int, int, error) {
	if req.StartVertex != nil && req.EndVertex != nil {
		return *req.StartVertex, *req.EndVertex, nil
	}

	if s.rooms != nil && strings.TrimSpace(req.StartRoom) != "" && strings.TrimSpace(req.EndRoom) != "" {
		startC, err := s.roomCentroid(building, floorNum, req.StartRoom)
		if err != nil {
			return 0, 0, err
		}
		endC, err := s.roomCentroid(building, floorNum, req.EndRoom)
		if err != nil {
			return 0, 0, err
		}
		// Use nearestVertexWithSplit to find closest point on edges and split graph
		return g.nearestVertexWithSplit(*startC), g.nearestVertexWithSplit(*endC), nil
	}

	if req.StartCoord != nil && req.EndCoord != nil {
		// Use nearestVertexWithSplit to find closest point on edges and split graph
		return g.nearestVertexWithSplit(*req.StartCoord), g.nearestVertexWithSplit(*req.EndCoord), nil
	}

	return 0, 0, errors.New("provide either startVertex/endVertex OR start/end coordinates OR startRoom/endRoom")
}

func (s *IndoorPathService) roomCentroid(building string, floorNum int, room string) (*domain.Coordinates, error) {
	rooms, err := s.rooms.GetByBuilding(building)
	fmt.Println(rooms)
	if err != nil {
		return nil, err
	}

	target := normalizeRoom(room)
	fmt.Println(target)
	for _, r := range rooms {
		if r.Floor != floorNum {
			continue
		}

		room2 := normalizeRoom(r.Room)
		fmt.Println(room2)
		if normalizeRoom(r.Room) == target {
			return &domain.Coordinates{X: r.Centroid.X, Y: r.Centroid.Y}, nil
		}
	}

	return nil, fmt.Errorf("room '%s' not found on floor %d of building %s", room, floorNum, building)
}

func normalizeRoom(s string) string {
	return strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(s), " ", ""))
}

var ErrNoPath = errors.New("no path found")

type graph struct {
	adj [][]neighbor
	pos []domain.Coordinates
}

type neighbor struct {
	to     int
	weight float64
}

func newGraphFromFloor(f domain.Floor, requireAccessible bool) (*graph, error) {
	n := len(f.Vertices)
	if n == 0 {
		return nil, errors.New("floor has no vertices")
	}

	adj := make([][]neighbor, n)
	for _, e := range f.Edges {
		u, v := e.StartVertex, e.EndVertex
		if u < 0 || v < 0 || u >= n || v >= n {
			return nil, errors.New("edge references invalid vertex index")
		}

		w := euclid(f.Vertices[u], f.Vertices[v])

		// Indoor edges are typically undirected (hallways)
		adj[u] = append(adj[u], neighbor{to: v, weight: w})
		adj[v] = append(adj[v], neighbor{to: u, weight: w})
	}

	return &graph{adj: adj, pos: f.Vertices}, nil
}

func (g *graph) nearestVertex(p domain.Coordinates) int {
	best := 0
	bestD := math.MaxFloat64
	for i, v := range g.pos {
		dx := v.X - p.X
		dy := v.Y - p.Y
		d := dx*dx + dy*dy // squared distance
		if d < bestD {
			bestD = d
			best = i
		}
	}
	return best
}

func (g *graph) pathCoordinates(path []int) []domain.Coordinates {
	out := make([]domain.Coordinates, 0, len(path))
	for _, idx := range path {
		out = append(out, g.pos[idx])
	}
	return out
}

func euclid(a, b domain.Coordinates) float64 {
	dx := a.X - b.X
	dy := a.Y - b.Y
	return math.Sqrt(dx*dx + dy*dy)
}

func (g *graph) shortestPath(start, goal int) ([]int, float64, error) {
	n := len(g.pos)
	if start < 0 || start >= n || goal < 0 || goal >= n {
		return nil, 0, errors.New("start/goal out of range")
	}
	if start == goal {
		return []int{start}, 0, nil
	}

	const inf = math.MaxFloat64
	dist := make([]float64, n)
	prev := make([]int, n)
	used := make([]bool, n)

	for i := 0; i < n; i++ {
		dist[i] = inf
		prev[i] = -1
	}
	dist[start] = 0

	for {
		u := -1
		best := inf
		for i := 0; i < n; i++ {
			if !used[i] && dist[i] < best {
				best = dist[i]
				u = i
			}
		}
		if u == -1 {
			break
		}
		if u == goal {
			break
		}

		used[u] = true
		for _, nb := range g.adj[u] {
			if used[nb.to] {
				continue
			}
			nd := dist[u] + nb.weight
			if nd < dist[nb.to] {
				dist[nb.to] = nd
				prev[nb.to] = u
			}
		}
	}

	if dist[goal] == inf {
		return nil, 0, ErrNoPath
	}

	// Reconstruct path
	path := []int{}
	for v := goal; v != -1; v = prev[v] {
		path = append(path, v)
	}
	for i, j := 0, len(path)-1; i < j; i, j = i+1, j-1 {
		path[i], path[j] = path[j], path[i]
	}

	return path, dist[goal], nil
}

// calculateTurnDirections computes turn directions (left/right/straight) at each point in the path
// Uses cross product to determine turn direction: > 0 means left turn, < 0 means right turn
func calculateTurnDirections(coords []domain.Coordinates) []TurnDirection {
	if len(coords) < 3 {
		return []TurnDirection{}
	}

	directions := make([]TurnDirection, 0, len(coords)-2)

	for i := 1; i < len(coords)-1; i++ {
		prev := coords[i-1]
		curr := coords[i]
		next := coords[i+1]

		// Current direction vector: curr - prev
		currDirX := curr.X - prev.X
		currDirY := curr.Y - prev.Y

		// Next direction vector: next - curr
		nextDirX := next.X - curr.X
		nextDirY := next.Y - curr.Y

		// Cross product: currDir × nextDir = currDirX * nextDirY - currDirY * nextDirX
		// Positive = left turn, Negative = right turn
		crossProduct := currDirX*nextDirY - currDirY*nextDirX

		// Calculate angle using dot product to detect straight paths
		dotProduct := currDirX*nextDirX + currDirY*nextDirY
		magCurr := math.Sqrt(currDirX*currDirX + currDirY*currDirY)
		magNext := math.Sqrt(nextDirX*nextDirX + nextDirY*nextDirY)

		if magCurr > 0 && magNext > 0 {
			cosAngle := dotProduct / (magCurr * magNext)
			if cosAngle > StraightTurnThreshold {
				directions = append(directions, TurnStraight)
			} else if crossProduct > 0 {
				directions = append(directions, TurnLeft)
			} else {
				directions = append(directions, TurnRight)
			}
		} else {
			directions = append(directions, TurnStraight)
		}
	}

	return directions
}

// nearestPointOnEdge finds the closest point on any edge to the given coordinate
// Returns the point, the edge indices (u, v), and the distance
func (g *graph) nearestPointOnEdge(p domain.Coordinates) (domain.Coordinates, int, int, float64) {
	bestPoint := p
	bestU, bestV := -1, -1
	bestDist := math.MaxFloat64

	// Track visited edges to avoid duplicates (since graph is undirected)
	visited := make(map[[2]int]bool)

	for u, neighbors := range g.adj {
		for _, nb := range neighbors {
			v := nb.to
			// Create normalized edge key
			edgeKey := [2]int{u, v}
			if u > v {
				edgeKey = [2]int{v, u}
			}
			if visited[edgeKey] {
				continue
			}
			visited[edgeKey] = true

			// Find closest point on segment (u, v) to p
			a := g.pos[u]
			b := g.pos[v]
			closest := closestPointOnSegment(p, a, b)
			d := euclid(p, closest)

			if d < bestDist {
				bestDist = d
				bestPoint = closest
				bestU = u
				bestV = v
			}
		}
	}

	return bestPoint, bestU, bestV, bestDist
}

// closestPointOnSegment finds the closest point on line segment AB to point P
func closestPointOnSegment(p, a, b domain.Coordinates) domain.Coordinates {
	// Vector from a to b
	abX := b.X - a.X
	abY := b.Y - a.Y

	// Vector from a to p
	apX := p.X - a.X
	apY := p.Y - a.Y

	// Project ap onto ab, computing parameterized position t
	ab2 := abX*abX + abY*abY
	if ab2 == 0 {
		// a and b are the same point
		return a
	}

	t := (apX*abX + apY*abY) / ab2

	// Clamp t to [0, 1] to stay on segment
	if t < 0 {
		t = 0
	} else if t > 1 {
		t = 1
	}

	// Compute the closest point
	return domain.Coordinates{
		X: a.X + t*abX,
		Y: a.Y + t*abY,
	}
}

// insertVertexOnEdge adds a new vertex on the edge between u and v, splitting it
// Returns the index of the new vertex
func (g *graph) insertVertexOnEdge(newPos domain.Coordinates, u, v int) int {
	newIdx := len(g.pos)
	g.pos = append(g.pos, newPos)
	g.adj = append(g.adj, []neighbor{})

	// Calculate distances
	distToU := euclid(newPos, g.pos[u])
	distToV := euclid(newPos, g.pos[v])

	// Remove the old edge between u and v
	g.removeEdge(u, v)
	g.removeEdge(v, u)

	// Add new edges: u <-> newIdx <-> v
	g.adj[u] = append(g.adj[u], neighbor{to: newIdx, weight: distToU})
	g.adj[newIdx] = append(g.adj[newIdx], neighbor{to: u, weight: distToU})
	g.adj[v] = append(g.adj[v], neighbor{to: newIdx, weight: distToV})
	g.adj[newIdx] = append(g.adj[newIdx], neighbor{to: v, weight: distToV})

	return newIdx
}

// removeEdge removes the edge from u to v
func (g *graph) removeEdge(u, v int) {
	newAdj := make([]neighbor, 0, len(g.adj[u]))
	for _, nb := range g.adj[u] {
		if nb.to != v {
			newAdj = append(newAdj, nb)
		}
	}
	g.adj[u] = newAdj
}

// nearestVertexWithSplit finds the nearest point to p on any edge, splits that edge,
// and returns the index of the inserted vertex. If p is very close to an existing vertex, returns that instead.
func (g *graph) nearestVertexWithSplit(p domain.Coordinates) int {
	const epsilon = 1e-9 // Threshold for considering point on existing vertex

	// First check if p is very close to an existing vertex
	closestVertexIdx := g.nearestVertex(p)
	closestVertexDist := euclid(p, g.pos[closestVertexIdx])

	// Find closest point on any edge
	edgePoint, edgeU, edgeV, edgeDist := g.nearestPointOnEdge(p)

	// If no valid edge found or vertex is closer, use existing vertex
	if edgeU < 0 || closestVertexDist <= edgeDist+epsilon {
		return closestVertexIdx
	}

	// Check if edge point is essentially the same as an endpoint
	if euclid(edgePoint, g.pos[edgeU]) < epsilon {
		return edgeU
	}
	if euclid(edgePoint, g.pos[edgeV]) < epsilon {
		return edgeV
	}

	// Split the edge and insert a new vertex
	return g.insertVertexOnEdge(edgePoint, edgeU, edgeV)
}

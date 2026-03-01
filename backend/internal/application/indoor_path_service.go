package application

import (
	"errors"
	"math"
	"strings"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

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
}

// MultiFloorPathRequest for pathfinding across different floors in same building
type MultiFloorPathRequest struct {
	BuildingCode   string              `json:"buildingCode"`
	StartFloor     int                 `json:"startFloor"`
	EndFloor       int                 `json:"endFloor"`
	StartCoord     *domain.Coordinates `json:"start"`
	EndCoord       *domain.Coordinates `json:"end"`
	StartRoom      string              `json:"startRoom"`
	EndRoom        string              `json:"endRoom"`
	PreferElevator bool                `json:"preferElevator"`
}

// FloorSegment represents a path segment on a single floor
type FloorSegment struct {
	FloorNumber int                  `json:"floorNumber"`
	FloorName   string               `json:"floorName"`
	Path        []domain.Coordinates `json:"path"`
	Distance    float64              `json:"distance"`
}

// MultiFloorPathResult contains path across multiple floors
type MultiFloorPathResult struct {
	Segments       []FloorSegment `json:"segments"`
	TotalDistance  float64        `json:"totalDistance"`
	TransitionType string         `json:"transitionType"` // "stairs" or "elevator"
}

type IndoorPathResult struct {
	Path     []domain.Coordinates `json:"path"`
	Distance float64              `json:"distance"`
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

	g, err := newGraphFromFloor(*floor)
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

	return &IndoorPathResult{
		Path:     g.pathCoordinates(vertexPath),
		Distance: dist,
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
		return nil, errors.New("end coordinate or endRoom is required")
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

	// Find transition points (stairs/elevator) on both floors
	transitionType := "stairs"
	if req.PreferElevator {
		transitionType = "elevator"
	}

	startTransition := s.findTransitionPoint(startFloor, transitionType)
	endTransition := s.findTransitionPoint(endFloor, transitionType)

	// Fallback to any available transition if preferred not found
	if startTransition == nil {
		startTransition = s.findTransitionPoint(startFloor, "stairs")
		transitionType = "stairs"
	}
	if startTransition == nil {
		startTransition = s.findTransitionPoint(startFloor, "elevator")
		transitionType = "elevator"
	}
	if endTransition == nil {
		endTransition = s.findTransitionPoint(endFloor, transitionType)
	}
	if startTransition == nil || endTransition == nil {
		return nil, errors.New("no transition point (stairs/elevator) found on floor")
	}

	// Calculate path on start floor: from start point to transition
	startGraph, err := newGraphFromFloor(*startFloor)
	if err != nil {
		return nil, err
	}

	var startPoint domain.Coordinates
	if req.StartCoord != nil {
		startPoint = *req.StartCoord
	} else {
		c, err := s.roomCentroid(req.BuildingCode, req.StartFloor, req.StartRoom)
		if err != nil {
			return nil, err
		}
		startPoint = *c
	}

	startIdx := startGraph.nearestVertex(startPoint)
	transitionStartIdx := startGraph.nearestVertex(*startTransition)

	pathToTransition, distToTransition, err := startGraph.shortestPath(startIdx, transitionStartIdx)
	if err != nil {
		return nil, errors.New("no path to transition point on start floor")
	}

	// Calculate path on end floor: from transition to end point
	endGraph, err := newGraphFromFloor(*endFloor)
	if err != nil {
		return nil, err
	}

	var endPoint domain.Coordinates
	if req.EndCoord != nil {
		endPoint = *req.EndCoord
	} else {
		c, err := s.roomCentroid(req.BuildingCode, req.EndFloor, req.EndRoom)
		if err != nil {
			return nil, err
		}
		endPoint = *c
	}

	transitionEndIdx := endGraph.nearestVertex(*endTransition)
	endIdx := endGraph.nearestVertex(endPoint)

	pathFromTransition, distFromTransition, err := endGraph.shortestPath(transitionEndIdx, endIdx)
	if err != nil {
		return nil, errors.New("no path from transition point on end floor")
	}

	// Build result with floor segments
	segments := []FloorSegment{
		{
			FloorNumber: req.StartFloor,
			FloorName:   startFloor.FloorName,
			Path:        startGraph.pathCoordinates(pathToTransition),
			Distance:    distToTransition,
		},
		{
			FloorNumber: req.EndFloor,
			FloorName:   endFloor.FloorName,
			Path:        endGraph.pathCoordinates(pathFromTransition),
			Distance:    distFromTransition,
		},
	}

	return &MultiFloorPathResult{
		Segments:       segments,
		TotalDistance:  distToTransition + distFromTransition,
		TransitionType: transitionType,
	}, nil
}

// sameFloorPath handles navigation when start and end are on the same floor
func (s *IndoorPathService) sameFloorPath(req MultiFloorPathRequest, floor *domain.Floor) (*MultiFloorPathResult, error) {
	g, err := newGraphFromFloor(*floor)
	if err != nil {
		return nil, err
	}

	// Resolve start point
	var startPoint domain.Coordinates
	if req.StartCoord != nil {
		startPoint = *req.StartCoord
	} else {
		c, err := s.roomCentroid(req.BuildingCode, req.StartFloor, req.StartRoom)
		if err != nil {
			return nil, err
		}
		startPoint = *c
	}

	// Resolve end point
	var endPoint domain.Coordinates
	if req.EndCoord != nil {
		endPoint = *req.EndCoord
	} else {
		c, err := s.roomCentroid(req.BuildingCode, req.EndFloor, req.EndRoom)
		if err != nil {
			return nil, err
		}
		endPoint = *c
	}

	startIdx := g.nearestVertex(startPoint)
	endIdx := g.nearestVertex(endPoint)

	vertexPath, dist, err := g.shortestPath(startIdx, endIdx)
	if err != nil {
		return nil, err
	}

	segments := []FloorSegment{
		{
			FloorNumber: req.StartFloor,
			FloorName:   floor.FloorName,
			Path:        g.pathCoordinates(vertexPath),
			Distance:    dist,
		},
	}

	return &MultiFloorPathResult{
		Segments:       segments,
		TotalDistance:  dist,
		TransitionType: "none",
	}, nil
}

// findTransitionPoint finds stairs or elevator POI on a floor
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
		return g.nearestVertex(*startC), g.nearestVertex(*endC), nil
	}

	if req.StartCoord != nil && req.EndCoord != nil {
		return g.nearestVertex(*req.StartCoord), g.nearestVertex(*req.EndCoord), nil
	}

	return 0, 0, errors.New("provide either startVertex/endVertex OR start/end coordinates OR startRoom/endRoom")
}

func (s *IndoorPathService) roomCentroid(building string, floorNum int, room string) (*domain.Coordinates, error) {
	rooms, err := s.rooms.GetByBuilding(building)
	if err != nil {
		return nil, err
	}

	target := normalizeRoom(room)
	for _, r := range rooms {
		if r.Floor != floorNum {
			continue
		}
		if normalizeRoom(r.Room) == target {
			return &domain.Coordinates{X: r.Centroid.X, Y: r.Centroid.Y}, nil
		}
	}

	return nil, errors.New("room not found on that floor")
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

func newGraphFromFloor(f domain.Floor) (*graph, error) {
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
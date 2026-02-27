package repository

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
)

func writeRoomsGeoJSON(t *testing.T, baseDir, building, content string) {
	t.Helper()
	dir := filepath.Join(baseDir, building)
	assert.NoError(t, os.MkdirAll(dir, 0o755))
	assert.NoError(t, os.WriteFile(filepath.Join(dir, "rooms.geojson"), []byte(content), 0o644))
}

func TestIndoorRoomRepository_ParsesPolygon_Centroid(t *testing.T) {
	tmp := t.TempDir()

	geojson := `{
	  "type":"FeatureCollection",
	  "features":[
	    {
	      "type":"Feature",
	      "properties":{"fid":1,"floor":0,"name":"S2.285"},
	      "geometry":{"type":"Polygon","coordinates":[[[0,0],[4,0],[4,4],[0,4],[0,0]]]}
	    }
	  ]
	}`
	writeRoomsGeoJSON(t, tmp, "MB", geojson)

	repo := NewIndoorRoomRepository(tmp)
	rooms, err := repo.GetByBuilding("mb") // lower -> should still work
	assert.NoError(t, err)
	assert.Len(t, rooms, 1)

	assert.Equal(t, "S2.285", rooms[0].Room)
	assert.Equal(t, "MB", rooms[0].Building)
	assert.Equal(t, 0, rooms[0].Floor)

	assert.InDelta(t, 2.0, rooms[0].Centroid.X, 0.0001)
	assert.InDelta(t, 2.0, rooms[0].Centroid.Y, 0.0001)
}

func TestIndoorRoomRepository_ParsesPointGeometry(t *testing.T) {
	tmp := t.TempDir()

	geojson := `{
	  "type":"FeatureCollection",
	  "features":[
	    {"type":"Feature","properties":{"fid":1,"floor":0,"name":"S2.273"},
	     "geometry":{"type":"Point","coordinates":[-1.5,7.25]}}
	  ]
	}`
	writeRoomsGeoJSON(t, tmp, "MB", geojson)

	repo := NewIndoorRoomRepository(tmp)
	rooms, err := repo.GetByBuilding("MB")
	assert.NoError(t, err)
	assert.Len(t, rooms, 1)
	assert.Equal(t, "Point", rooms[0].GeometryType)
	assert.Equal(t, -1.5, rooms[0].Centroid.X)
	assert.Equal(t, 7.25, rooms[0].Centroid.Y)
}

func TestIndoorRoomRepository_ParsesMultiPolygon(t *testing.T) {
	tmp := t.TempDir()

	geojson := `{
	  "type":"FeatureCollection",
	  "features":[
	    {"type":"Feature","properties":{"fid":1,"floor":0,"name":"S2.999"},
	     "geometry":{"type":"MultiPolygon","coordinates":[[[[0,0],[2,0],[2,2],[0,2],[0,0]]]]}}
	  ]
	}`
	writeRoomsGeoJSON(t, tmp, "MB", geojson)

	repo := NewIndoorRoomRepository(tmp)
	rooms, err := repo.GetByBuilding("MB")
	assert.NoError(t, err)
	assert.Len(t, rooms, 1)
	assert.Equal(t, "MultiPolygon", rooms[0].GeometryType)
	assert.InDelta(t, 1.0, rooms[0].Centroid.X, 0.0001)
	assert.InDelta(t, 1.0, rooms[0].Centroid.Y, 0.0001)
}

func TestIndoorRoomRepository_DegeneratePolygon_FallsBackToAverage(t *testing.T) {
	tmp := t.TempDir()

	// All points on a line -> area 0
	geojson := `{
	  "type":"FeatureCollection",
	  "features":[
	    {"type":"Feature","properties":{"fid":1,"floor":0,"name":"LINE"},
	     "geometry":{"type":"Polygon","coordinates":[[[0,0],[2,0],[4,0],[0,0]]]}}
	  ]
	}`
	writeRoomsGeoJSON(t, tmp, "MB", geojson)

	repo := NewIndoorRoomRepository(tmp)
	rooms, err := repo.GetByBuilding("MB")
	assert.NoError(t, err)
	assert.Len(t, rooms, 1)

	// average of points in ring (including closing point) => around x ~ (0+2+4+0)/4=1.5, y=0
	assert.InDelta(t, 1.5, rooms[0].Centroid.X, 0.0001)
	assert.InDelta(t, 0.0, rooms[0].Centroid.Y, 0.0001)
}

func TestIndoorRoomRepository_CachesResults(t *testing.T) {
	tmp := t.TempDir()

	geojson := `{
	  "type":"FeatureCollection",
	  "features":[
	    {"type":"Feature","properties":{"fid":1,"floor":0,"name":"S2.285"},
	     "geometry":{"type":"Point","coordinates":[1,2]}}
	  ]
	}`
	writeRoomsGeoJSON(t, tmp, "MB", geojson)

	repo := NewIndoorRoomRepository(tmp)

	rooms1, err := repo.GetByBuilding("MB")
	assert.NoError(t, err)
	assert.Len(t, rooms1, 1)

	// delete file; cached call should still succeed
	assert.NoError(t, os.Remove(filepath.Join(tmp, "MB", "rooms.geojson")))

	rooms2, err := repo.GetByBuilding("MB")
	assert.NoError(t, err)
	assert.Len(t, rooms2, 1)
}

func TestIndoorRoomRepository_EmptyBuildingError(t *testing.T) {
	repo := NewIndoorRoomRepository(t.TempDir())
	_, err := repo.GetByBuilding("")
	assert.Error(t, err)
}

func TestIndoorRoomRepository_FileNotFound(t *testing.T) {
	repo := NewIndoorRoomRepository(t.TempDir())
	_, err := repo.GetByBuilding("MB")
	assert.Error(t, err)
}

func TestIndoorRoomRepository_BadJSON(t *testing.T) {
	tmp := t.TempDir()
	writeRoomsGeoJSON(t, tmp, "MB", `{ this is not json }`)

	repo := NewIndoorRoomRepository(tmp)
	_, err := repo.GetByBuilding("MB")
	assert.Error(t, err)
}

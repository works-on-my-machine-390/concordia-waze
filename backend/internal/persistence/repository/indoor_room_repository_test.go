package repository

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIndoorRoomRepository_ParsesPolygonAndFindsCentroid(t *testing.T) {
	tmp := t.TempDir()
	mbDir := filepath.Join(tmp, "MB")
	assert.NoError(t, os.MkdirAll(mbDir, 0o755))

	geojson := `{
		"type":"FeatureCollection",
		"features":[
			{
			"type":"Feature",
			"properties":{"fid":1,"floor":0,"name":"S2.285"},
			"geometry":{
				"type":"Polygon",
				"coordinates":[[
				[0,0],[4,0],[4,4],[0,4],[0,0]
				]]
			}
			}
		]
	}`
	assert.NoError(t, os.WriteFile(filepath.Join(mbDir, "rooms.geojson"), []byte(geojson), 0o644))

	repo := NewIndoorRoomRepository(tmp)
	rooms, err := repo.GetByBuilding("MB")
	assert.NoError(t, err)
	assert.Len(t, rooms, 1)

	assert.Equal(t, "S2.285", rooms[0].Room)
	assert.Equal(t, 0, rooms[0].Floor)

	// centroid of square should be (2,2)
	assert.InDelta(t, 2.0, rooms[0].Centroid.X, 0.0001)
	assert.InDelta(t, 2.0, rooms[0].Centroid.Y, 0.0001)
}

func TestIndoorRoomRepository_Caches(t *testing.T) {
	tmp := t.TempDir()
	mbDir := filepath.Join(tmp, "MB")
	assert.NoError(t, os.MkdirAll(mbDir, 0o755))

	geojson := `{
	  "type":"FeatureCollection",
	  "features":[
	    {"type":"Feature","properties":{"room":"MB-101","floor":0},"geometry":{"type":"Point","coordinates":[1,2]}}
	  ]
	}`
	fp := filepath.Join(mbDir, "rooms.geojson")
	assert.NoError(t, os.WriteFile(fp, []byte(geojson), 0o644))

	repo := NewIndoorRoomRepository(tmp)

	rooms1, err := repo.GetByBuilding("MB")
	assert.NoError(t, err)
	assert.Len(t, rooms1, 1)

	assert.NoError(t, os.Remove(fp))

	rooms2, err := repo.GetByBuilding("MB")
	assert.NoError(t, err)
	assert.Len(t, rooms2, 1)
}

func TestIndoorRoomRepository_EmptyBuildingError(t *testing.T) {
	repo := NewIndoorRoomRepository(t.TempDir())
	_, err := repo.GetByBuilding("")
	assert.Error(t, err)
}

package repository

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIndoorPOIRepository_GetByBuilding_ParsesGeoJSON(t *testing.T) {
	tmp := t.TempDir()

	// Create MB/POIs.geojson
	mbDir := filepath.Join(tmp, "MB")
	assert.NoError(t, os.MkdirAll(mbDir, 0o755))

	geojson := `{
	  "type":"FeatureCollection",
	  "features":[
	    {
	      "type":"Feature",
	      "properties":{"fid":1,"floor":0,"type":"stairs"},
	      "geometry":{"type":"Point","coordinates":[-397068.6,180703.1]}
	    },
	    {
	      "type":"Feature",
	      "properties":{"fid":2,"floor":0,"type":"elevator"},
	      "geometry":{"type":"Point","coordinates":[-397070.0,180704.0]}
	    }
	  ]
	}`
	assert.NoError(t, os.WriteFile(filepath.Join(mbDir, "POIs.geojson"), []byte(geojson), 0o644))

	repo := NewIndoorPOIRepository(tmp)

	pois, err := repo.GetByBuilding("MB")
	assert.NoError(t, err)
	assert.Len(t, pois, 2)

	assert.Equal(t, 1, pois[0].ID)
	assert.Equal(t, "MB", pois[0].Building)
	assert.Equal(t, 0, pois[0].Floor)
	assert.Equal(t, "stairs", pois[0].Type)
	assert.Equal(t, -397068.6, pois[0].Position.X)
	assert.Equal(t, 180703.1, pois[0].Position.Y)
}

func TestIndoorPOIRepository_GetByBuilding_CachesResults(t *testing.T) {
	tmp := t.TempDir()
	mbDir := filepath.Join(tmp, "MB")
	assert.NoError(t, os.MkdirAll(mbDir, 0o755))

	geojson := `{
	  "type":"FeatureCollection",
	  "features":[
	    {
	      "type":"Feature",
	      "properties":{"fid":1,"floor":0,"type":"stairs"},
	      "geometry":{"type":"Point","coordinates":[1,2]}
	    }
	  ]
	}`
	filePath := filepath.Join(mbDir, "POIs.geojson")
	assert.NoError(t, os.WriteFile(filePath, []byte(geojson), 0o644))

	repo := NewIndoorPOIRepository(tmp)

	pois1, err := repo.GetByBuilding("MB")
	assert.NoError(t, err)
	assert.Len(t, pois1, 1)

	// Delete file after first read; cached call should still work
	assert.NoError(t, os.Remove(filePath))

	pois2, err := repo.GetByBuilding("MB")
	assert.NoError(t, err)
	assert.Len(t, pois2, 1)
}

func TestIndoorPOIRepository_GetByBuilding_EmptyBuildingError(t *testing.T) {
	repo := NewIndoorPOIRepository(t.TempDir())
	_, err := repo.GetByBuilding("")
	assert.Error(t, err)
}

func TestIndoorPOIRepository_GetByBuilding_FileNotFound(t *testing.T) {
	repo := NewIndoorPOIRepository(t.TempDir())
	_, err := repo.GetByBuilding("MB")
	assert.Error(t, err)
}

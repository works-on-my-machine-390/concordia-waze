package application

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLoadImage_ByExtensionAndLeadingSlash(t *testing.T) {
	tmp := t.TempDir()

	// create a simple PNG file
	name := "img.png"
	path := filepath.Join(tmp, name)
	pngHeader := []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'}
	if err := os.WriteFile(path, append(pngHeader, make([]byte, 100)...), 0644); err != nil {
		t.Fatalf("write file: %v", err)
	}

	s := NewImageService(nil, nil)
	data, ct, err := s.LoadImage(tmp, "/"+name) // leading slash should be normalized
	assert.NoError(t, err)
	assert.NotEmpty(t, data)
	assert.Equal(t, "image/png", ct)
}

func TestLoadImage_DetectContentType_NoExtension(t *testing.T) {
	tmp := t.TempDir()

	name := "doc"
	path := filepath.Join(tmp, name)
	content := []byte("hello world\nthis is a test\n")
	if err := os.WriteFile(path, content, 0644); err != nil {
		t.Fatalf("write file: %v", err)
	}

	s := NewImageService(nil, nil)
	data, ct, err := s.LoadImage(tmp, name)
	assert.NoError(t, err)
	assert.Equal(t, string(content), string(data))
	// DetectContentType usually returns "text/plain; charset=utf-8" for this content
	assert.True(t, strings.HasPrefix(ct, "text/plain"))
}

func TestLoadImage_NonExistentFile(t *testing.T) {
	tmp := t.TempDir()
	s := NewImageService(nil, nil)

	_, _, err := s.LoadImage(tmp, "nope.png")
	assert.Error(t, err)
	assert.True(t, os.IsNotExist(err))
}

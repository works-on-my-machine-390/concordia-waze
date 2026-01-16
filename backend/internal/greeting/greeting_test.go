package greeting

import (
	"testing"
)

func TestGenerateGreeting(t *testing.T) {
	expected := "hello world"
	result := generateGreeting()
	if result != expected {
		t.Errorf("Expected %s, but got %s", expected, result)
	}
}

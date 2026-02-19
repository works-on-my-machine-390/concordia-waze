package utils

import "testing"

func almostEqual(a, b float64) bool {
	const eps = 1e-9
	if a == b {
		return true
	}
	diff := a - b
	if diff < 0 {
		return -diff < eps
	}
	return diff < eps
}

func TestSqDist_Basic(t *testing.T) {
	t.Parallel()

	// 3-4-5 triangle -> squared distance = 25
	got := SqDist(0, 0, 3, 4)
	want := 25.0
	if !almostEqual(got, want) {
		t.Fatalf("SqDist(0,0,3,4) = %v; want %v", got, want)
	}
}

func TestSqDist_ZeroAndSymmetry(t *testing.T) {
	t.Parallel()

	// zero distance when identical points
	if d := SqDist(1.234, -5.678, 1.234, -5.678); !almostEqual(d, 0) {
		t.Fatalf("expected zero distance for identical points, got %v", d)
	}

	// symmetry: distance(a,b,c,d) == distance(c,d,a,b)
	a := SqDist(-10.5, 2.3, 4.7, 9.1)
	b := SqDist(4.7, 9.1, -10.5, 2.3)
	if !almostEqual(a, b) {
		t.Fatalf("expected symmetry: got %v and %v", a, b)
	}
}

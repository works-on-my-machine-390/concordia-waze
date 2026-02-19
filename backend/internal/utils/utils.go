package utils

// SqDist returns the squared Euclidean distance between two lat/lng points.
// Using squared distance avoids the cost of a square root when only comparison is needed.
func SqDist(lat1, lng1, lat2, lng2 float64) float64 {
	dlat := lat1 - lat2
	dlng := lng1 - lng2
	return dlat*dlat + dlng*dlng
}

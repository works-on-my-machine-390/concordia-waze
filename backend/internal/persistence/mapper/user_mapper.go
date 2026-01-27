package mapper

import "github.com/works-on-my-machine-390/concordia-waze/internal/domain"

// UserDataModel represents the user as stored in the database
type UserDataModel struct {
	ID       string
	Email    string
	Password string
	Name     string
}

// ToEntity converts a data model to a domain entity
func (m *UserDataModel) ToEntity() *domain.User {
	return &domain.User{
		ID:       m.ID,
		Email:    m.Email,
		Password: m.Password,
		Name:     m.Name,
	}
}

// FromEntity converts a domain entity to a data model
func FromEntity(user *domain.User) *UserDataModel {
	return &UserDataModel{
		ID:       user.ID,
		Email:    user.Email,
		Password: user.Password,
		Name:     user.Name,
	}
}

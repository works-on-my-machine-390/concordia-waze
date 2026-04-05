package mapper

import (
	"testing"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

func TestUserDataModelToEntity(t *testing.T) {
	model := &UserDataModel{
		ID:       "u-1",
		Email:    "john@concordia.ca",
		Password: "hashed-password",
		Name:     "John Doe",
	}

	entity := model.ToEntity()
	if entity == nil {
		t.Fatal("expected non-nil entity")
	}

	if entity.ID != model.ID {
		t.Errorf("expected ID %q, got %q", model.ID, entity.ID)
	}
	if entity.Email != model.Email {
		t.Errorf("expected Email %q, got %q", model.Email, entity.Email)
	}
	if entity.Password != model.Password {
		t.Errorf("expected Password %q, got %q", model.Password, entity.Password)
	}
	if entity.Name != model.Name {
		t.Errorf("expected Name %q, got %q", model.Name, entity.Name)
	}
}

func TestFromEntity(t *testing.T) {
	user := &domain.User{
		ID:       "u-2",
		Email:    "alice@concordia.ca",
		Password: "another-hash",
		Name:     "Alice",
	}

	model := FromEntity(user)
	if model == nil {
		t.Fatal("expected non-nil model")
	}

	if model.ID != user.ID {
		t.Errorf("expected ID %q, got %q", user.ID, model.ID)
	}
	if model.Email != user.Email {
		t.Errorf("expected Email %q, got %q", user.Email, model.Email)
	}
	if model.Password != user.Password {
		t.Errorf("expected Password %q, got %q", user.Password, model.Password)
	}
	if model.Name != user.Name {
		t.Errorf("expected Name %q, got %q", user.Name, model.Name)
	}
}

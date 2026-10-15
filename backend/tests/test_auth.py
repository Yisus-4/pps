import pytest
from app.models.escuela import Escuela
from app.models.user import User


def test_login_success_json(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@undec.edu.ar", "password": "admin123"}
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@undec.edu.ar"
    assert data["user"]["role"] == "ADMIN"


def test_login_success_form(client):
    response = client.post(
        "/api/auth/login",
        data={"username": "admin@undec.edu.ar", "password": "admin123"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_invalid_password(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@undec.edu.ar", "password": "wrongpassword"}
    )
    assert response.status_code == 401


def test_get_me(client, admin_headers):
    response = client.get("/api/auth/me", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "admin@undec.edu.ar"
    assert data["role"] == "ADMIN"


def test_admin_creates_user_and_lists(client, admin_headers, db_session):
    esc_ing = db_session.query(Escuela).filter(Escuela.nombre == "Escuela de Ingeniería").first()

    # Create new user
    new_user_payload = {
        "email": "profesor@undec.edu.ar",
        "full_name": "Profesor Juan Pérez",
        "password": "securepassword",
        "role": "RESPONSABLE_ACADEMICA",
        "escuela_id": esc_ing.id
    }
    create_res = client.post("/api/users", headers=admin_headers, json=new_user_payload)
    assert create_res.status_code == 201, create_res.text
    created_data = create_res.json()
    assert created_data["email"] == "profesor@undec.edu.ar"
    assert created_data["escuela_nombre"] == "Escuela de Ingeniería"

    # List users
    list_res = client.get("/api/users", headers=admin_headers)
    assert list_res.status_code == 200
    emails = [u["email"] for u in list_res.json()]
    assert "admin@undec.edu.ar" in emails
    assert "profesor@undec.edu.ar" in emails


def test_non_admin_cannot_create_user(client, ingenieria_headers):
    payload = {
        "email": "hacker@undec.edu.ar",
        "full_name": "Intruso",
        "password": "password",
        "role": "ADMIN"
    }
    res = client.post("/api/users", headers={"Authorization": ingenieria_headers["Authorization"]}, json=payload)
    assert res.status_code == 403

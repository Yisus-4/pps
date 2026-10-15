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


def test_admin_updates_user_success(client, admin_headers, db_session):
    esc_ing = db_session.query(Escuela).filter(Escuela.nombre == "Escuela de Ingeniería").first()
    esc_soc = db_session.query(Escuela).filter(Escuela.nombre == "Escuela de Ciencias Sociales").first()

    # Create user first
    new_user_payload = {
        "email": "editable@undec.edu.ar",
        "full_name": "Nombre Original",
        "password": "initialpass123",
        "role": "RESPONSABLE_ACADEMICA",
        "escuela_id": esc_ing.id
    }
    create_res = client.post("/api/users", headers=admin_headers, json=new_user_payload)
    assert create_res.status_code == 201
    user_id = create_res.json()["id"]

    # Update user: change name, email, school, and password
    update_payload = {
        "full_name": "Nombre Modificado",
        "email": "modificado@undec.edu.ar",
        "role": "RESPONSABLE_ACADEMICA",
        "escuela_id": esc_soc.id,
        "password": "newpassword456",
        "is_active": True
    }
    put_res = client.put(f"/api/users/{user_id}", headers=admin_headers, json=update_payload)
    assert put_res.status_code == 200, put_res.text
    put_data = put_res.json()
    assert put_data["full_name"] == "Nombre Modificado"
    assert put_data["email"] == "modificado@undec.edu.ar"
    assert put_data["escuela_id"] == esc_soc.id
    assert put_data["escuela_nombre"] == "Escuela de Ciencias Sociales"

    # Verify user can log in with new credentials
    login_res = client.post("/api/auth/login", json={"email": "modificado@undec.edu.ar", "password": "newpassword456"})
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


def test_update_user_validations(client, admin_headers, db_session):
    esc_ing = db_session.query(Escuela).filter(Escuela.nombre == "Escuela de Ingeniería").first()

    # Create two users
    u1_res = client.post("/api/users", headers=admin_headers, json={
        "email": "user1@undec.edu.ar",
        "full_name": "User One",
        "password": "password123",
        "role": "RESPONSABLE_ACADEMICA",
        "escuela_id": esc_ing.id
    })
    u1_id = u1_res.json()["id"]

    client.post("/api/users", headers=admin_headers, json={
        "email": "user2@undec.edu.ar",
        "full_name": "User Two",
        "password": "password123",
        "role": "RESPONSABLE_ACADEMICA",
        "escuela_id": esc_ing.id
    })

    # 1. Duplicate email should fail
    dup_res = client.put(f"/api/users/{u1_id}", headers=admin_headers, json={
        "email": "user2@undec.edu.ar"
    })
    assert dup_res.status_code == 400
    assert "Ya existe un usuario" in dup_res.json()["detail"]

    # 2. RESPONSABLE_ACADEMICA without escuela_id should fail
    no_esc_res = client.put(f"/api/users/{u1_id}", headers=admin_headers, json={
        "role": "RESPONSABLE_ACADEMICA",
        "escuela_id": None
    })
    assert no_esc_res.status_code == 400
    assert "debe estar asignado a una Escuela" in no_esc_res.json()["detail"]

    # 3. Non-existent user should return 404
    not_found_res = client.put("/api/users/99999", headers=admin_headers, json={"full_name": "Ghost"})
    assert not_found_res.status_code == 404


def test_delete_user_and_permissions(client, admin_headers, ingenieria_headers, db_session):
    esc_ing = db_session.query(Escuela).filter(Escuela.nombre == "Escuela de Ingeniería").first()

    # Create user to delete
    create_res = client.post("/api/users", headers=admin_headers, json={
        "email": "to_delete@undec.edu.ar",
        "full_name": "Para Eliminar",
        "password": "password123",
        "role": "RESPONSABLE_ACADEMICA",
        "escuela_id": esc_ing.id
    })
    user_id = create_res.json()["id"]

    # 1. Non-admin cannot delete
    forbidden_res = client.delete(f"/api/users/{user_id}", headers={"Authorization": ingenieria_headers["Authorization"]})
    assert forbidden_res.status_code == 403

    # 2. Admin cannot delete self
    admin_user = db_session.query(User).filter(User.email == "admin@undec.edu.ar").first()
    self_delete_res = client.delete(f"/api/users/{admin_user.id}", headers=admin_headers)
    assert self_delete_res.status_code == 400
    assert "No puede eliminar su propia cuenta" in self_delete_res.json()["detail"]

    # 3. Admin successfully deletes user
    del_res = client.delete(f"/api/users/{user_id}", headers=admin_headers)
    assert del_res.status_code == 200
    assert "to_delete@undec.edu.ar" in del_res.json()["message"]

    # 4. Deleted user cannot log in
    login_res = client.post("/api/auth/login", json={"email": "to_delete@undec.edu.ar", "password": "password123"})
    assert login_res.status_code == 401

    # 5. Deleting non-existent user returns 404
    nf_res = client.delete("/api/users/99999", headers=admin_headers)
    assert nf_res.status_code == 404


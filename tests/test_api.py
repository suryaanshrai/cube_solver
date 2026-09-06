"""API tests. Fixtures are shared with the JavaScript suite (web/src/cube/fixtures.json),
so both sides of the wire are checked against the same 58 cube states."""

import json
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import SOLVED, FaceletError, app, validate_facelets  # noqa: E402

FIXTURES = json.load(
    open(
        os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "web",
            "src",
            "cube",
            "fixtures.json",
        )
    )
)


@pytest.fixture()
def client():
    app.config.update(TESTING=True)
    with app.test_client() as c:
        yield c


def test_health(client):
    assert client.get("/api/health").get_json()["status"] == "ok"


def test_solved_cube_needs_no_moves(client):
    body = client.post("/api/solve", json={"facelets": SOLVED}).get_json()
    assert body["moves"] == []
    assert body["solved"] is True


@pytest.mark.parametrize("fixture", FIXTURES[:18], ids=lambda f: f["kind"] + (f["move"] or ""))
def test_single_move_states_solve_to_the_inverse(client, fixture):
    body = client.post("/api/solve", json={"facelets": fixture["facelets"]}).get_json()
    assert body["moves"] == fixture["solution"]


def test_every_fixture_solves(client):
    for fixture in FIXTURES:
        response = client.post("/api/solve", json={"facelets": fixture["facelets"]})
        assert response.status_code == 200, fixture["facelets"]
        assert response.get_json()["count"] > 0


def test_lowercase_input_is_accepted(client):
    response = client.post("/api/solve", json={"facelets": FIXTURES[0]["facelets"].lower()})
    assert response.status_code == 200


@pytest.mark.parametrize(
    "facelets,fragment",
    [
        ("", "54 stickers"),
        ("U" * 53, "54 stickers"),
        ("X" * 54, "only use the letters"),
        ("U" * 54, "exactly 9 stickers"),
    ],
)
def test_bad_input_is_rejected_with_a_reason(client, facelets, fragment):
    response = client.post("/api/solve", json={"facelets": facelets})
    assert response.status_code == 400
    assert fragment in response.get_json()["error"]


def test_moved_centre_is_named(client):
    cells = list(SOLVED)
    cells[4], cells[13] = cells[13], cells[4]  # swap the U and R centres, counts intact
    facelets = "".join(cells)
    response = client.post("/api/solve", json={"facelets": facelets})
    assert response.status_code == 400
    assert "centre" in response.get_json()["error"].lower()


def test_impossible_cube_is_422_not_500(client):
    cells = list(SOLVED)
    cells[7], cells[19] = cells[19], cells[7]  # a single flipped edge
    response = client.post("/api/solve", json={"facelets": "".join(cells)})
    assert response.status_code == 422
    assert response.get_json()["kind"] == "unsolvable"


def test_missing_body_does_not_crash(client):
    assert client.post("/api/solve").status_code == 400


def test_validate_facelets_rejects_non_strings():
    with pytest.raises(FaceletError):
        validate_facelets(None)

from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
import os
import db

app = Flask(__name__)
db.init_db()
app.secret_key = db.get_or_create_secret_key()

PUBLIC_PATHS = {"/login", "/register"}


@app.before_request
def require_login():
    if request.path.startswith("/static/"):
        return
    if request.path in PUBLIC_PATHS:
        return
    if session.get("user_id"):
        return
    if request.path.startswith("/api/"):
        return jsonify({"error": "unauthorized"}), 401
    return redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        user = db.get_user_by_username(username)
        if user and check_password_hash(user["password_hash"], password):
            session["user_id"] = user["id"]
            session["username"] = user["username"]
            session.permanent = True
            return redirect(url_for("home"))
        error = "Неверный логин или пароль"
    return render_template("login.html", error=error)


@app.route("/register", methods=["GET", "POST"])
def register():
    error = None
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        if len(username) < 2:
            error = "Логин слишком короткий"
        elif len(password) < 4:
            error = "Пароль слишком короткий (минимум 4 символа)"
        elif db.get_user_by_username(username):
            error = "Такой логин уже занят"
        else:
            user_id = db.create_user(username, generate_password_hash(password))
            session["user_id"] = user_id
            session["username"] = username
            session.permanent = True
            return redirect(url_for("home"))
    return render_template("register.html", error=error)


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/")
def home():
    return render_template("index.html", username=session.get("username", ""))


@app.route("/api/days", methods=["GET"])
def api_get_days():
    return jsonify(db.get_all_days(session["user_id"]))


@app.route("/api/days/<date>", methods=["POST"])
def api_upsert_day(date):
    db.upsert_day(session["user_id"], date, request.get_json())
    return jsonify({"ok": True})


@app.route("/api/days/<date>", methods=["DELETE"])
def api_delete_day(date):
    db.delete_day(session["user_id"], date)
    return jsonify({"ok": True})


@app.route("/api/settings", methods=["GET"])
def api_get_settings():
    return jsonify(db.get_settings(session["user_id"]))


@app.route("/api/settings", methods=["POST"])
def api_save_settings():
    db.save_settings(session["user_id"], request.get_json())
    return jsonify({"ok": True})


@app.route("/api/monthly-rates", methods=["GET"])
def api_get_monthly_rates():
    return jsonify(db.get_monthly_rates(session["user_id"]))


@app.route("/api/monthly-rates/<month>", methods=["POST"])
def api_set_monthly_rate(month):
    db.set_monthly_rate(session["user_id"], month, request.get_json().get("rate"))
    return jsonify({"ok": True})


@app.route("/api/notes", methods=["GET"])
def api_get_notes():
    return jsonify(db.get_notes(session["user_id"]))


@app.route("/api/notes", methods=["POST"])
def api_add_note():
    text = (request.get_json() or {}).get("text", "").strip()
    if not text:
        return jsonify({"error": "empty"}), 400
    return jsonify(db.add_note(session["user_id"], text))


@app.route("/api/notes/<int:note_id>", methods=["DELETE"])
def api_delete_note(note_id):
    db.delete_note(session["user_id"], note_id)
    return jsonify({"ok": True})


@app.route("/api/reminders", methods=["GET"])
def api_get_reminders():
    return jsonify(db.get_reminders(session["user_id"]))


@app.route("/api/reminders", methods=["POST"])
def api_add_reminder():
    data = request.get_json() or {}
    return jsonify(db.add_reminder(session["user_id"], data.get("label", "").strip(), data.get("date"), data.get("time")))


@app.route("/api/reminders/<int:reminder_id>", methods=["PATCH"])
def api_toggle_reminder(reminder_id):
    db.toggle_reminder(session["user_id"], reminder_id, (request.get_json() or {}).get("enabled", True))
    return jsonify({"ok": True})


@app.route("/api/reminders/<int:reminder_id>", methods=["DELETE"])
def api_delete_reminder(reminder_id):
    db.delete_reminder(session["user_id"], reminder_id)
    return jsonify({"ok": True})


if __name__ == "__main__":
    debug_mode = os.environ.get("FACTORY_HELPER_DEBUG") == "1"
    app.run(host="0.0.0.0", port=5000, debug=debug_mode)
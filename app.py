from flask import Flask, redirect, render_template
from rubik_solver import utils

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/input")
def input():
    return render_template("input.html")
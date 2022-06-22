from string import whitespace
from sys import builtin_module_names
from flask import Flask, redirect, render_template, request
from rubik_solver import utils
import cv2 as cv

yellow = cv.imread("static/duck.jpg")
blue = cv.imread("static/duck.jpg")
red = cv.imread("static/duck.jpg")
green = cv.imread("static/duck.jpg")
orange = cv.imread("static/duck.jpg")
white = cv.imread("static/duck.jpg")

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/input", methods=["GET", "POST"])
def input():
    if request.method == "POST":
        return redirect("/inyellow")
    return render_template("input.html")

@app.route("/inyellow", methods=["GET", "POST"])
def inyellow():
    if request.method == "POST":
        yellow = cv.imread(request.form.get("yellow"))
        return redirect("/inblue")
    return render_template("inyellow.html")


@app.route("/inblue", methods=["GET", "POST"])
def inblue():
    if request.method == "POST":
        yellow = cv.imread(request.form.get("blue"))
        return redirect("/inred")
    return render_template("inblue.html")


@app.route("/inred", methods=["GET", "POST"])
def inred():
    if request.method == "POST":
        yellow = cv.imread(request.form.get("red"))
        return redirect("/ingreen")
    return render_template("inred.html")


@app.route("/ingreen", methods=["GET", "POST"])
def ingreen():
    if request.method == "POST":
        green = cv.imread(request.form.get("green"))
        return redirect("/inorange")
    return render_template("ingreen.html")


@app.route("/inorange", methods=["GET", "POST"])
def inorange():
    if request.method == "POST":
        orange = cv.imread(request.form.get("orange"))
        return redirect("/inwhite")
    return render_template("inorange.html")


@app.route("/inwhite", methods=["GET", "POST"])
def inwhite():
    if request.method == "POST":
        white = cv.imread(request.form.get("white"))
        return redirect("/")
    return render_template("inwhite.html")
from string import whitespace
from sys import builtin_module_names
from flask import Flask, redirect, render_template, request
from rubik_solver import utils
import cv2 as cv

app = Flask(__name__)

def apology(message):
    return render_template("apology.html", message=message)

def checkIn(side):
    if len(side) != 9:
        return apology("Not all colors were filled, try submitting again")
    for i in side:
        if i not in ['w','W','y','Y','r','R','o','O','b','B','g','G']:
            return apology("Some colors were not correct, try submitting again")

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
        global yellow
        yellow = cv.imread(request.form.get("yellow"))
        global syellow
        syellow = request.form.get("syellow").strip()
        return redirect("/inblue")
    return render_template("inyellow.html")


@app.route("/inblue", methods=["GET", "POST"])
def inblue():
    if request.method == "POST":
        global blue
        blue = cv.imread(request.form.get("blue"))
        global sblue 
        sblue = request.form.get("sblue").strip()
        checkIn(side=sblue)
        return redirect("/inred")
    return render_template("inblue.html")


@app.route("/inred", methods=["GET", "POST"])
def inred():
    if request.method == "POST":
        global red
        red = cv.imread(request.form.get("red"))
        global sred 
        sred = request.form.get("sred").strip()
        checkIn(sred)
        return redirect("/ingreen")
    return render_template("inred.html")


@app.route("/ingreen", methods=["GET", "POST"])
def ingreen():
    if request.method == "POST":
        global green
        green = cv.imread(request.form.get("green"))
        global sgreen 
        sgreen = request.form.get("sgreen").strip()
        checkIn(sgreen)
        return redirect("/inorange")
    return render_template("ingreen.html")


@app.route("/inorange", methods=["GET", "POST"])
def inorange():
    if request.method == "POST":
        global orange
        orange = cv.imread(request.form.get("orange"))
        global sorange 
        sorange = request.form.get("sorange").strip()
        checkIn(sorange)
        return redirect("/inwhite")
    return render_template("inorange.html")


@app.route("/inwhite", methods=["GET", "POST"])
def inwhite():
    if request.method == "POST":
        global white
        white = cv.imread(request.form.get("white"))
        global swhite 
        swhite = request.form.get("swhite").strip()
        checkIn(swhite)
        return redirect("/solution")
    return render_template("inwhite.html")

@app.route("/solution", methods=["GET", "POST"])
def solution():
    cube = syellow + blue + sred + sgreen + sorange + swhite
    soln = utils.solve(cube, 'Kociemba')
    return render_template("solution.html", soln=soln)

    """
    wgyoybwgo
    ryowbwbrb
    goworgoyo
    bobygwgyg
    rwgborrrw
    ybybwrrgy
    """
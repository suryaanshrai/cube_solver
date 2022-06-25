from rubik_solver import utils
def convert(x):
    cmoves = {
            "F":"F", "B":"B", "L":"L", "R":"R","U":"U", "D":"D",
            "F\'":"f","B\'":"b", "L\'":"l", "R\'":"r", "U\'":"u", "D\'":"d",
            "F2":"g", "B2":"c", "L2":"m", "R2":"s", "U2":"v", "D2":"e"
            }
    return cmoves[x]
solnString = ""
cube = 'wgyoybwgoryowbwbrbgoworgoyobobygwgygrwgborrrwybybwrrgy'
soln = utils.solve(cube, 'Kociemba')
print(soln)
for i in soln:
    solnString += str(convert(str(i)))
print(solnString)
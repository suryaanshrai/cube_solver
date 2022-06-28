import kociemba
def convertCube(cube):
    cube = cube.upper()
    converted = ""
    cube_map = {"Y":"U", "B":"L", "R":"F", "G":"R", "O":"B", "W":"D"}
    for i in cube:
        converted += cube_map[i]
    return converted
cube = 'owogygorowrywgwgyyywgorbgrywbrowrrybbybybgbbrggwoobrow'

cube = convertCube(cube)
print(cube)

print(len(kociemba.solve(cube).split()))
"""
    1. yellow with orange on top
    2. green with yellow on top
    3. red with yellow on top
    4. white red on top
    5. blue with yellow on top
    6. orange with yellow on top
"""
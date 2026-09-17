"""Make a separate web-ready copy of the supplied pig; never overwrite the source."""
import bpy, sys, math
from pathlib import Path
from mathutils import Vector, Matrix

root = Path(sys.argv[sys.argv.index('--') + 1])
source = Path(sys.argv[sys.argv.index('--') + 2])
bpy.ops.wm.open_mainfile(filepath=str(source))
for obj in list(bpy.data.objects):
    if obj.type != 'MESH': bpy.data.objects.remove(obj, do_unlink=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

def material(name, color, metallic=0, roughness=.5):
    mat = bpy.data.materials.new(name); mat.use_nodes = True
    p = mat.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metallic
    p.inputs['Roughness'].default_value = roughness
    return mat

pink = material('Rose skin', (.72,.235,.30), 0,.56)
steel = material('Forged blue steel', (.13,.20,.25),.72,.3)
leather = material('Midnight leather', (.025,.045,.047),0,.72)
ivory = material('Eye ivory', (.96,.91,.77),0,.27)
pupil = material('Dark brown pupil', (.018,.008,.006),0,.23)
gold = material('Brass rivets', (.64,.36,.075),.7,.3)
for obj in list(bpy.data.objects):
    obj.data.materials.clear()
    obj.data.materials.append(steel if obj.name=='casco' else leather if obj.name=='ropa' else pink)
    for poly in obj.data.polygons: poly.material_index=0; poly.use_smooth=True

def ball(name, pos, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, location=pos)
    obj=bpy.context.object; obj.name=name; obj.scale=scale; obj.data.materials.append(mat)
    for poly in obj.data.polygons: poly.use_smooth=True
    return obj

for side in [-1,1]:
    ball('Eye', (side*.205,-.738,.265),(.117,.07,.13),ivory)
    ball('Pupil', (side*.20,-.797,.27),(.059,.024,.075),pupil)
    ball('Eye sparkle',(side*.20-.018,-.817,.303),(.018,.009,.024),ivory)
    ball('Helmet rivet',(side*.27,-.66,.46),(.027,.018,.027),gold)

# Ground the model and orient its snout toward +X, matching the endless track.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
rotation=Matrix.Rotation(math.pi/2,4,'Z')
for obj in bpy.context.selected_objects:
    for vertex in obj.data.vertices:
        vertex.co=rotation @ vertex.co
        vertex.co.z+=.725163
(root/'art').mkdir(exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(root/'art/CrazyPig_Hero.blend'))
bpy.ops.export_scene.gltf(filepath=str(root/'public/models/pig-hero.glb'),export_format='GLB',use_selection=True,export_apply=True,export_animations=False)
print('REFERENCE_PIG_EXPORTED')

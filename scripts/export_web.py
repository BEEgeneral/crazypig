import bpy, sys
from pathlib import Path
root=Path(sys.argv[sys.argv.index('--')+1])
bpy.ops.wm.open_mainfile(filepath=str(root.parent/'CrazyPigUnreal/Art/Blender/CrazyPig_Valley.blend'))
bpy.ops.object.select_all(action='DESELECT')
bpy.context.scene.unit_settings.scale_length=1
out=bpy.data.collections.new('WebExports');bpy.context.scene.collection.children.link(out)
mat=bpy.data.materials.new('VillagePalette');mat.use_nodes=True
bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(1,1,1,1);bs.inputs['Roughness'].default_value=.85
for source in list(bpy.data.collections['01 - Original asset library'].objects):
    obj=bpy.data.objects.new(source.name.replace('SM_',''),source.data.copy());out.objects.link(obj)
    for v in obj.data.vertices:v.co*=.01
    obj.data.materials.clear();obj.data.materials.append(mat)
    for p in obj.data.polygons:p.material_index=0
    obj.select_set(True)
    bpy.context.view_layer.objects.active=obj
bpy.ops.export_scene.gltf(filepath=str(root/'public/models/valley.glb'),export_format='GLB',use_selection=True,export_apply=True,export_materials='EXPORT',export_animations=False,export_vertex_color='NAME',export_vertex_color_name='Color')
print('WEB_ASSETS_EXPORTED')

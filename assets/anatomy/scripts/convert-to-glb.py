#!/usr/bin/env python3
"""
Blender headless script to convert FBX/OBJ/BLEND to GLB
Usage: blender --background --python convert-to-glb.py -- <input_path> <output_path> [options]

Options:
  --draco           Apply Draco compression
  --export-muscles  Export each mesh as separate file (for muscle models)
"""

import bpy
import sys
import os
import json
import mathutils

def clear_scene():
    """Remove all objects from scene"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

    # Clear orphan data
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)

def import_model(filepath):
    """Import model based on file extension"""
    ext = os.path.splitext(filepath)[1].lower()

    if ext == '.fbx':
        bpy.ops.import_scene.fbx(filepath=filepath)
    elif ext == '.obj':
        bpy.ops.wm.obj_import(filepath=filepath)
    elif ext in ['.gltf', '.glb']:
        bpy.ops.import_scene.gltf(filepath=filepath)
    elif ext == '.blend':
        # For .blend files, we append all objects from the file
        with bpy.data.libraries.load(filepath, link=False) as (data_from, data_to):
            data_to.objects = data_from.objects
            data_to.collections = data_from.collections

        # Link objects to scene
        for obj in data_to.objects:
            if obj is not None:
                bpy.context.collection.objects.link(obj)
    else:
        raise ValueError(f"Unsupported format: {ext}")

def normalize_transforms():
    """Apply all transforms and normalize"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

def fix_normals():
    """Recalculate normals for all meshes"""
    for obj in bpy.data.objects:
        if obj.type == 'MESH':
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='SELECT')
            bpy.ops.mesh.normals_make_consistent(inside=False)
            bpy.ops.object.mode_set(mode='OBJECT')

def get_mesh_info():
    """Collect mesh information for validation"""
    info = {
        'mesh_count': 0,
        'mesh_names': [],
        'total_triangles': 0,
        'has_uvs': True,
        'has_armature': False,
        'bone_count': 0,
        'bounding_box': {
            'min': [float('inf'), float('inf'), float('inf')],
            'max': [float('-inf'), float('-inf'), float('-inf')]
        }
    }

    for obj in bpy.data.objects:
        if obj.type == 'MESH':
            info['mesh_count'] += 1
            info['mesh_names'].append(obj.name)

            # Count triangles
            mesh = obj.data
            mesh.calc_loop_triangles()
            info['total_triangles'] += len(mesh.loop_triangles)

            # Check UVs
            if not mesh.uv_layers:
                info['has_uvs'] = False

            # Update bounding box
            for v in obj.bound_box:
                world_v = obj.matrix_world @ mathutils.Vector(v)
                for i in range(3):
                    info['bounding_box']['min'][i] = min(info['bounding_box']['min'][i], world_v[i])
                    info['bounding_box']['max'][i] = max(info['bounding_box']['max'][i], world_v[i])

        elif obj.type == 'ARMATURE':
            info['has_armature'] = True
            info['bone_count'] = len(obj.data.bones)

    return info

def export_glb(output_path, use_draco=False):
    """Export scene to GLB"""
    export_settings = {
        'filepath': output_path,
        'export_format': 'GLB',
        'export_texcoords': True,
        'export_normals': True,
        'export_materials': 'EXPORT',
        'export_colors': True,
        'export_cameras': False,
        'export_lights': False,
        'export_animations': True,
        'export_skins': True,
        'export_extras': True,
    }

    if use_draco:
        export_settings['export_draco_mesh_compression_enable'] = True
        export_settings['export_draco_mesh_compression_level'] = 6

    bpy.ops.export_scene.gltf(**export_settings)

def export_individual_meshes(output_dir, prefix=""):
    """Export each mesh as a separate GLB file"""
    exported = []

    for obj in bpy.data.objects:
        if obj.type == 'MESH':
            # Deselect all
            bpy.ops.object.select_all(action='DESELECT')

            # Select only this mesh
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj

            # Generate safe filename
            safe_name = obj.name.replace(' ', '_').replace('/', '_').replace('\\', '_')
            output_path = os.path.join(output_dir, f"{prefix}{safe_name}.glb")

            # Export
            bpy.ops.export_scene.gltf(
                filepath=output_path,
                export_format='GLB',
                use_selection=True,
                export_texcoords=True,
                export_normals=True,
                export_materials='EXPORT',
            )

            exported.append({
                'name': obj.name,
                'file': os.path.basename(output_path),
                'triangles': len(obj.data.loop_triangles) if hasattr(obj.data, 'loop_triangles') else 0
            })

    return exported

def main():
    # Parse arguments after '--'
    argv = sys.argv
    if '--' in argv:
        argv = argv[argv.index('--') + 1:]
    else:
        argv = []

    if len(argv) < 2:
        print("Usage: blender --background --python convert-to-glb.py -- <input> <output> [--draco] [--export-muscles]")
        sys.exit(1)

    input_path = argv[0]
    output_path = argv[1]
    use_draco = '--draco' in argv
    export_muscles = '--export-muscles' in argv

    print(f"Converting: {input_path}")
    print(f"Output: {output_path}")
    print(f"Draco: {use_draco}")
    print(f"Export muscles separately: {export_muscles}")

    clear_scene()
    import_model(input_path)
    normalize_transforms()

    try:
        fix_normals()
    except Exception as e:
        print(f"Warning: Could not fix normals: {e}")

    info = get_mesh_info()
    print(f"Mesh info: {json.dumps(info, indent=2, default=str)}")

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    if export_muscles:
        # Export each mesh separately
        output_dir = os.path.dirname(output_path)
        muscles_dir = os.path.join(output_dir, 'muscles')
        os.makedirs(muscles_dir, exist_ok=True)

        exported = export_individual_meshes(muscles_dir)

        # Write muscle manifest
        muscle_manifest_path = os.path.join(output_dir, 'muscles.json')
        with open(muscle_manifest_path, 'w') as f:
            json.dump({
                'total_meshes': len(exported),
                'meshes': exported
            }, f, indent=2)

        print(f"Exported {len(exported)} individual meshes to {muscles_dir}")

    # Also export combined model
    export_glb(output_path, use_draco)

    # Write info file
    info_path = output_path.replace('.glb', '.info.json')
    with open(info_path, 'w') as f:
        json.dump(info, f, indent=2, default=str)

    print(f"Conversion complete: {output_path}")

if __name__ == '__main__':
    main()

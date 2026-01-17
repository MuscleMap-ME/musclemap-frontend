#!/usr/bin/env python3
"""
Simplified Blender headless script to convert BLEND to GLB
Usage: blender --background --factory-startup --python convert-to-glb-simple.py -- <input_path> <output_path>
"""

import bpy
import sys
import os
import json

def main():
    # Parse arguments after '--'
    argv = sys.argv
    if '--' in argv:
        argv = argv[argv.index('--') + 1:]
    else:
        argv = []

    if len(argv) < 2:
        print("Usage: blender --background --factory-startup --python convert-to-glb-simple.py -- <input> <output>")
        sys.exit(1)

    input_path = argv[0]
    output_path = argv[1]

    print(f"Converting: {input_path}")
    print(f"Output: {output_path}")

    # Open the blend file directly
    bpy.ops.wm.open_mainfile(filepath=input_path, load_ui=False)

    # Collect mesh information
    info = {
        'mesh_count': 0,
        'mesh_names': [],
        'total_triangles': 0,
        'has_uvs': True,
        'has_armature': False,
        'bone_count': 0
    }

    for obj in bpy.data.objects:
        if obj.type == 'MESH':
            info['mesh_count'] += 1
            info['mesh_names'].append(obj.name)

            # Count triangles (approximate from faces)
            mesh = obj.data
            try:
                mesh.calc_loop_triangles()
                info['total_triangles'] += len(mesh.loop_triangles)
            except:
                # Fallback: estimate triangles from faces
                info['total_triangles'] += len(mesh.polygons) * 2

            # Check UVs
            if not mesh.uv_layers:
                info['has_uvs'] = False

        elif obj.type == 'ARMATURE':
            info['has_armature'] = True
            info['bone_count'] = len(obj.data.bones)

    print(f"Found {info['mesh_count']} meshes, {info['total_triangles']} triangles (approx)")

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Export to GLB (Blender 5.0 compatible parameters)
    try:
        bpy.ops.export_scene.gltf(
            filepath=output_path,
            export_format='GLB',
            export_texcoords=True,
            export_normals=True,
            export_materials='EXPORT',
            export_cameras=False,
            export_lights=False,
            export_animations=True,
            export_skins=True,
        )
        print(f"Export successful: {output_path}")
    except Exception as e:
        print(f"Export error: {e}")
        # Try with minimal parameters
        print("Trying with minimal export parameters...")
        try:
            bpy.ops.export_scene.gltf(
                filepath=output_path,
                export_format='GLB',
            )
            print(f"Minimal export successful: {output_path}")
        except Exception as e2:
            print(f"Minimal export also failed: {e2}")
            sys.exit(1)

    # Write info file
    info_path = output_path.replace('.glb', '.info.json')
    with open(info_path, 'w') as f:
        json.dump(info, f, indent=2, default=str)

    print(f"Conversion complete!")

if __name__ == '__main__':
    main()

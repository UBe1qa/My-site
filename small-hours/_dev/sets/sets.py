# Set layouts: for each set the camera is fixed (looks down -Z, up +Y, like the site), the watch turns in front of it,
# and a table lies under it at elevation angle e. Works out:
#   - the table distance h below the focus point, so the watch head never goes through the table over the set's keys
#   - the photo window in tan space (union of every key's view, phone and PC), so one photo covers the whole set
# and renders a clay layout (table grid + back wall) per set and device for Seedream to follow.
import bpy, sys, math, json
import numpy as np
from mathutils import Euler, Vector, Quaternion, Matrix

PI = math.pi
D, DSET = 3.9, 20.0
DEV = {'phone': (390, 844), 'pc': (1440, 900)}
O, C, B, M, BACK = (0, 0, 0), (1.9, 0, -0.2), (0.25, -0.1, -0.5), (0, -0.8, 0.1), (0, 0, -0.4)
BAL, ROT = (-0.954, 0.124, -0.32), (0.45, -0.45, -0.45)

def keys(dev):
    W, H = DEV[dev]; wide = dev == 'pc'
    actual = 0.42 if wide else 39 * 6.05 / W
    def k(s, rx, ry, rz, tgt, size, oy=0, ox=0, w=None):
        if wide:
            if w: size, oy, ox = w
            else: size, oy, ox = size * 0.6, oy * 0.3, ox + 0.16
        return dict(s=s, r=(rx, ry, rz), tgt=tgt, size=size, oy=oy, ox=ox)
    return [
        k(2.0, -0.26, 0, 0, O, 0.74, -0.17), k(3.0, -0.30, -0.2, 0.05, O, 0.8, -0.12),
        k(3.75, -0.25, -1.1, -0.75, C, 2.0, 0.21), k(6.45, -0.35, -0.95, -0.62, C, 1.9, 0.21),
        k(7.1, 0.3, PI - 0.55, 0.2, B, 1.55, 0.2), k(8.3, 0.32, PI - 0.42, 0.25, B, 1.45, 0.2),
        k(10.2, 0.15, PI - 0.2, 0.05, BAL, 5.0, 0.0, 0, [3.2, 0, 0.16]), k(11.8, 0.1, PI - 0.08, 0.12, BAL, 5.6, 0.0, 0, [3.5, 0, 0.16]),
        k(13.0, 0.12, PI + 0.15, 0, ROT, 1.8, 0.05), k(14.0, 0.0, PI + 0.3, 0, BACK, 0.9, 0.0),
        k(26.0, -0.5, 0.1, 0, M, 1.45, -0.22, 0, [1.3, -0.06, 0.19]), k(28.9, -0.45, 0.03, 0, M, 1.4, -0.22, 0, [1.25, -0.06, 0.19]),
        k(29.8, -0.35, -0.35, 0.1, O, 0.78, -0.14), k(31.9, -0.3, 0.35, 0.05, O, 0.8, -0.14),
        k(36.7, 0.12, PI - 0.15, 0, BACK, 0.92, -0.1), k(39.8, 0.10, PI + 0.12, 0, BACK, 0.95, -0.1),
        k(40.6, -0.08, 0, 0, O, 0.8, -0.04, 0, [0.55, 0, 0]),
        k(46.35, -0.15, -0.2, -0.6, O, 0.95, 0.05, 0, [0.62, 0, 0.14]),
        k(47.0, 0, 0, -0.5, O, actual, -0.1, 0, [actual, -0.02, 0]),
    ]

# set: name, s range, elevation (deg), lens: the set's own camera distance
SETS = [('desk', 1.9, 14.1, 18), ('drafting', 25.9, 32.0, 48), ('engrave', 36.5, 40.7, 28), ('morning', 46.3, 48.6, 90)]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='/mnt/project-files/small-hours/3d/watch-plain.glb')
root = bpy.data.objects['watch']
pivot = bpy.data.objects.new('pivot', None); bpy.context.scene.collection.objects.link(pivot)
root.parent = pivot
CONV = Matrix.Rotation(-PI / 2, 4, 'X')   # undo the importer's Y-up to Z-up turn: Blender coords = the site's coords
dg = bpy.context.evaluated_depsgraph_get()
head = []
for o in bpy.data.objects:
    if o.type != 'MESH': continue
    if 'strap' in o.name or 'buckle' in o.name or 'keeper' in o.name: o.hide_render = True; continue
    head.append(o)
bpy.context.view_layer.update()
# vertices of the head in the site's watch frame
pts = []
for o in head:
    m = CONV @ o.matrix_world
    me = o.evaluated_get(dg).to_mesh()
    v = np.array([(m @ vv.co)[:] for vv in me.vertices])
    pts.append(v[::max(1, len(v) // 400)])
pts = np.concatenate(pts)
print('head extent', pts.min(0), pts.max(0))

def qof(r): return Euler(r, 'XYZ').to_quaternion()   # Blender XYZ == three.js 'ZYX'

def slerp_keys(K):
    out = []
    for a, b in zip(K, K[1:]):
        for t in np.linspace(0, 1, 5)[:-1]:
            out.append((qof(a['r']).slerp(qof(b['r']), t), Vector(a['tgt']).lerp(Vector(b['tgt']), t)))
    out.append((qof(K[-1]['r']), Vector(K[-1]['tgt'])))
    return out

info = {}
for name, s0, s1, e in SETS:
    er = math.radians(e)
    U = np.array([0, math.cos(er), math.sin(er)])
    info[name] = {'e': e}
    hs = []
    for dev in DEV:
        K = [k for k in keys(dev) if s0 <= k['s'] <= s1]
        for q, tgt in slerp_keys(K):
            R = np.array(q.to_matrix())
            tw = R @ np.array(tgt)
            p = pts @ R.T - tw
            hs.append(-(p @ U).min())
    h = max(hs) + 0.35
    info[name]['h'] = h
    for dev, (W, H) in DEV.items():
        K = [k for k in keys(dev) if s0 <= k['s'] <= s1]
        ref = H if dev == 'pc' else W
        A = W / H
        x0 = y0 = 1e9; x1 = y1 = -1e9
        for k in K:
            T = D * H / (2 * k['size'] * ref * DSET) / (H / 2) * (H / 2)   # tan(fov/2) at the set's distance
            T = D / (2 * k['size'] * ref / H * DSET)
            x0 = min(x0, (-1 - 2 * k['ox']) * T * A); x1 = max(x1, (1 - 2 * k['ox']) * T * A)
            y0 = min(y0, (-1 - 2 * k['oy']) * T); y1 = max(y1, (1 - 2 * k['oy']) * T)
        # a little bleed, then grow to the photo's aspect (9:16 or 16:9)
        PA = 16 / 9 if dev == 'pc' else 9 / 16
        xc, yc, hx, hy = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 * 1.06, (y1 - y0) / 2 * 1.06
        if hx / hy < PA: hx = hy * PA
        else: hy = hx / PA
        info[name][dev] = dict(xc=xc, yc=yc, hx=hx, hy=hy)

print(json.dumps(info, indent=1))
json.dump(info, open('/tmp/claude-0/sets/sets.json', 'w'), indent=1)

# ---------- clay layouts ----------
for o in head: o.hide_render = True
grid = bpy.data.materials.new('grid'); grid.use_nodes = True
nt = grid.node_tree; bs = nt.nodes['Principled BSDF']
ck = nt.nodes.new('ShaderNodeTexChecker'); ck.inputs['Scale'].default_value = 1
ck.inputs['Color1'].default_value = (0.42, 0.42, 0.42, 1); ck.inputs['Color2'].default_value = (0.30, 0.30, 0.30, 1)
tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (0.25, 0.25, 0.25)
nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], ck.inputs['Vector'])
nt.links.new(ck.outputs['Color'], bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = 0.8
wallm = bpy.data.materials.new('wall'); wallm.use_nodes = True
wallm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.5, 0.5, 0.5, 1)
cam = bpy.data.cameras.new('cam'); cam.sensor_fit = 'VERTICAL'; cam.clip_end = 2000
co = bpy.data.objects.new('cam', cam); bpy.context.scene.collection.objects.link(co)
co.location = (0, 0, DSET); co.rotation_euler = (0, 0, 0)
bpy.context.scene.camera = co
key = bpy.data.lights.new('key', 'AREA'); key.energy = 60000; key.size = 40
ko = bpy.data.objects.new('key', key); bpy.context.scene.collection.objects.link(ko)
w = bpy.data.worlds.new('w'); bpy.context.scene.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.25
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 16; sc.cycles.use_denoising = True
objs = []
for name, s0, s1, e in SETS:
    for o in objs: bpy.data.objects.remove(o, do_unlink=True)
    objs = []
    er = math.radians(e); U = Vector((0, math.cos(er), math.sin(er))); Fh = Vector((0, math.sin(er), -math.cos(er)))
    h = info[name]['h']
    bpy.ops.mesh.primitive_plane_add(size=600, location=-h * U)
    t = bpy.context.object; t.rotation_mode = 'QUATERNION'; t.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(U)
    t.data.materials.append(grid); objs.append(t)
    if e < 80:
        bpy.ops.mesh.primitive_plane_add(size=600, location=-h * U + 70 * Fh)
        wl = bpy.context.object; wl.rotation_mode = 'QUATERNION'; wl.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(-Fh)
        wl.data.materials.append(wallm); objs.append(wl)
    # key light: upper left of frame, above the table
    ko.location = Vector((-40, 0, 0)) + 50 * U + 10 * Vector((0, 0, 1))
    ko.rotation_mode = 'QUATERNION'; ko.rotation_quaternion = (-ko.location).to_track_quat('-Z', 'Y')
    for dev in DEV:
        p = info[name][dev]
        R = (1440, 810) if dev == 'pc' else (720, 1280)
        # render a symmetric window wide enough, crop to the photo window afterwards
        mx, my = abs(p['xc']) + p['hx'], abs(p['yc']) + p['hy']
        mx, my = max(mx, my * R[0] / R[1]), max(my, mx * R[1] / R[0])
        cam.angle_y = 2 * math.atan(my)
        scale = my / p['hy']
        sc.render.resolution_x, sc.render.resolution_y = int(R[0] * scale), int(R[1] * scale)
        sc.render.filepath = f'/tmp/claude-0/sets/raw-{name}-{dev}.png'
        bpy.ops.render.render(write_still=True)
        info[name][dev]['render'] = dict(mx=mx, my=my, w=sc.render.resolution_x, h=sc.render.resolution_y)
json.dump(info, open('/tmp/claude-0/sets/sets.json', 'w'), indent=1)
print('done')

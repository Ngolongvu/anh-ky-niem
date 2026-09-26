import * as THREE from "three";
import { Line2 } from "jsm/lines/Line2.js";
import { LineMaterial } from "jsm/lines/LineMaterial.js";
import { LineGeometry } from "jsm/lines/LineGeometry.js";

export function createBasicOrbitalRing(scene, color, radius) {
    const points = [];
    for (let i = 0; i <= 360; i++) {
        const angle = THREE.MathUtils.degToRad(i);
        points.push(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    }

    const geometry = new LineGeometry();
    geometry.setPositions(points);

    const material = new LineMaterial({
        color,
        linewidth: 1.5,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
    });
    material.resolution.set(window.innerWidth, window.innerHeight);

    const ring = new Line2(geometry, material);
    ring.computeLineDistances();
    scene.add(ring);
    return ring;
}

export function createBackgroundSphere(scene, texture) {
    const geometry = new THREE.SphereGeometry(4000, 64, 64);
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
    const background = new THREE.Mesh(geometry, material);
    scene.add(background);
    return background;
}

export function createRandomStars(scene) {
    const geometry = new THREE.BufferGeometry();
    const positions = [];

    for (let i = 0; i < 4000; i++) {
        const dir = new THREE.Vector3(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1
        ).normalize();
        dir.multiplyScalar(THREE.MathUtils.randFloat(2000, 3800));
        positions.push(dir.x, dir.y, dir.z);
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0xffffff, size: 2, transparent: true, opacity: 0.3 });
    const stars = new THREE.Points(geometry, material);
    scene.add(stars);
}

export function createHeartMesh(scene) {
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, 0);
    heartShape.bezierCurveTo(0, -3, -5, -15, -25, -15);
    heartShape.bezierCurveTo(-55, -15, -55, 22.5, -55, 22.5);
    heartShape.bezierCurveTo(-55, 40, -35, 62, 0, 80);
    heartShape.bezierCurveTo(35, 62, 55, 40, 55, 22.5);
    heartShape.bezierCurveTo(55, 22.5, 55, -15, 25, -15);
    heartShape.bezierCurveTo(10, -15, 0, -3, 0, 0);

    const extrudeSettings = { depth: 15, bevelEnabled: true, bevelSegments: 5, steps: 2, bevelSize: 4, bevelThickness: 4 };
    const geometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
    geometry.center();
    geometry.rotateX(Math.PI);

    const material = new THREE.MeshStandardMaterial({
        color: 0xff1744,
        emissive: 0xff2a5f,
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.1
    });

    const heartMesh = new THREE.Mesh(geometry, material);
    scene.add(heartMesh);
    return heartMesh;
}

/* TẠO VÀ SẮP XẾP CÁC TẤM ẢNH BẰNG TẬP DỮ LIỆU ĐÃ LƯU */
export function createPhotoGroup(parentGroup, photoItems) {
    // Dọn sạch ảnh cũ trong scene 3D
    while (parentGroup.children.length > 0) {
        const obj = parentGroup.children[0];
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (obj.material.map) obj.material.map.dispose();
            obj.material.dispose();
        }
        parentGroup.remove(obj);
    }

    const count = photoItems.length;
    if (count === 0) return;

    const orbitRadii = [120, 180, 250];

    photoItems.forEach((item, index) => {
        const texture = item.texture;
        const img = texture.image;
        const aspect = (img && img.width && img.height) ? (img.width / img.height) : 1.33;
        
        const width = 22;
        const height = width / aspect;

        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide,
            roughness: 0.3
        });

        const photoMesh = new THREE.Mesh(geometry, material);

        // Đính kèm dữ liệu ảnh vào Mesh để phục vụ Click & Delete
        photoMesh.userData = { photoData: item };

        const radius = orbitRadii[index % orbitRadii.length];
        const angle = (index / count) * Math.PI * 2;
        const yOffset = (Math.sin(index) * 25);

        photoMesh.position.set(
            Math.cos(angle) * radius,
            yOffset,
            Math.sin(angle) * radius
        );

        photoMesh.lookAt(0, yOffset, 0);
        parentGroup.add(photoMesh);
    });
}
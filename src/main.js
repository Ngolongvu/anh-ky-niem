import * as THREE from "three";
import { createScene } from "./scene.js";
import { createPointLight, createAmbientLight, createLensFlare } from "./lights.js";
import { 
    createRandomStars, 
    createBasicOrbitalRing, 
    createBackgroundSphere,
    createHeartMesh,
    createPhotoGroup
} from "./objects.js";
import { createControl } from "./controls.js";
import { EffectComposer } from "jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "jsm/postprocessing/UnrealBloomPass.js";

const w = window.innerWidth;
const h = window.innerHeight;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 8000);
camera.position.set(0, 100, 350);
camera.lookAt(0, 0, 0);

const scene = createScene(0x000000);

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.2, 0.35, 0.86  
);
composer.addPass(bloomPass);

const pointLight = createPointLight(scene, 0xFFFFFF, 500, 0, 0.9);
pointLight.position.set(0, 0, 0);
createAmbientLight(scene, 0xFFFFFF, 0.5);

/**************** BỘ QUẢN LÝ LOADING ****************/
const loadingScreen = document.querySelector("#loading-screen");
const loadingBarFill = document.querySelector("#loading-bar-fill");
const loadingPercent = document.querySelector("#loading-percent");

let isLoaded = false;
function hideLoadingScreen() {
    if (isLoaded) return;
    isLoaded = true;
    if (loadingBarFill) loadingBarFill.style.width = "100%";
    if (loadingPercent) loadingPercent.textContent = "100%";
    if (loadingScreen) {
        setTimeout(() => loadingScreen.classList.add("loaded"), 300);
    }
}

const loadingManager = new THREE.LoadingManager();
loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
    const pct = Math.round((itemsLoaded / itemsTotal) * 100);
    if (loadingBarFill) loadingBarFill.style.width = pct + "%";
    if (loadingPercent) loadingPercent.textContent = pct + "%";
};
loadingManager.onLoad = () => hideLoadingScreen();
loadingManager.onError = () => hideLoadingScreen();
setTimeout(() => hideLoadingScreen(), 2500);

/**************** BỘ LƯU TRỮ BỘ NHỚ TRÌNH DUYỆT (INDEXEDDB) ****************/
function openPhotoDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open("HeartSolarPhotosDB", 1);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("photos")) {
                db.createObjectStore("photos", { keyPath: "id" });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function savePhotoToDB(id, dataUrl) {
    const db = await openPhotoDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("photos", "readwrite");
        tx.objectStore("photos").put({ id, dataUrl });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getSavedPhotosFromDB() {
    const db = await openPhotoDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("photos", "readonly");
        const req = tx.objectStore("photos").getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

async function deletePhotoFromDB(id) {
    const db = await openPhotoDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("photos", "readwrite");
        tx.objectStore("photos").delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/**************** TEXTURES & KHÔNG GIAN ****************/
const textureLoader = new THREE.TextureLoader(loadingManager);
const backgroundTexture = textureLoader.load("./public/textures/milky_way.jpg", (t) => {
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
});

createLensFlare(pointLight);
const background = createBackgroundSphere(scene, backgroundTexture);
createRandomStars(scene);

const heartMesh = createHeartMesh(scene);
heartMesh.position.set(0, 0, 0);

createBasicOrbitalRing(scene, 0xff2a5f, 120);
createBasicOrbitalRing(scene, 0x4287f5, 180);
createBasicOrbitalRing(scene, 0xffb74d, 250);

/**************** QUẢN LÝ DANH SÁCH ẢNH ****************/
const photoPivot = new THREE.Object3D();
scene.add(photoPivot);

let allPhotoItems = [];

async function initPhotos() {
    // 1. Tải ảnh đã lưu từ IndexedDB
    const savedPhotos = await getSavedPhotosFromDB();
    
    savedPhotos.forEach((item) => {
        textureLoader.load(item.dataUrl, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            allPhotoItems.push({ id: item.id, texture, src: item.dataUrl });
            createPhotoGroup(photoPivot, allPhotoItems);
        });
    });

    // 2. Tải thêm ảnh mặc định trong thư mục public/photos/
    const defaultPhotoPaths = [
        './public/photos/1.jpg',
        './public/photos/2.jpg',
        './public/photos/3.jpg',
        './public/photos/4.jpg',
        './public/photos/5.jpg'
    ];

    defaultPhotoPaths.forEach((path, idx) => {
        textureLoader.load(
            path,
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                allPhotoItems.push({ id: 'default_' + idx, texture, src: path, isDefault: true });
                createPhotoGroup(photoPivot, allPhotoItems);
            },
            undefined,
            () => console.warn("Không thấy ảnh mặc định:", path)
        );
    });
}

initPhotos();

// Tải ảnh mới từ máy tính người dùng
const imageUploadInput = document.querySelector("#image-upload");
if (imageUploadInput) {
    imageUploadInput.addEventListener("change", (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const dataUrl = e.target.result;
                const photoId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

                await savePhotoToDB(photoId, dataUrl);

                textureLoader.load(dataUrl, (texture) => {
                    texture.colorSpace = THREE.SRGBColorSpace;
                    allPhotoItems.push({ id: photoId, texture, src: dataUrl });
                    createPhotoGroup(photoPivot, allPhotoItems);
                });
            };
            reader.readAsDataURL(file);
        });
    });
}

/**************** SỰ KIỆN CLICK XEM & XÓA ẢNH ****************/
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const imageModal = document.querySelector("#image-modal");
const modalImg = document.querySelector("#modal-img");
const closeModalBtn = document.querySelector("#close-modal");
const deletePhotoBtn = document.querySelector("#delete-photo-btn");

let activePhotoData = null;

window.addEventListener("click", (event) => {
    if (event.target.tagName !== "CANVAS") return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(photoPivot.children);

    if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        if (clickedMesh.userData && clickedMesh.userData.photoData) {
            activePhotoData = clickedMesh.userData.photoData;
            modalImg.src = activePhotoData.src;
            imageModal.style.display = "flex";
        }
    }
});

// Xóa ảnh
if (deletePhotoBtn) {
    deletePhotoBtn.addEventListener("click", async () => {
        if (!activePhotoData) return;

        if (!activePhotoData.isDefault) {
            await deletePhotoFromDB(activePhotoData.id);
        }

        allPhotoItems = allPhotoItems.filter(item => item.id !== activePhotoData.id);
        createPhotoGroup(photoPivot, allPhotoItems);

        imageModal.style.display = "none";
        activePhotoData = null;
    });
}

if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
        imageModal.style.display = "none";
        activePhotoData = null;
    });
}

imageModal.addEventListener("click", (e) => {
    if (e.target === imageModal) {
        imageModal.style.display = "none";
        activePhotoData = null;
    }
});

/**************** XỬ LÝ NHẠC NỀN ****************/
const musicBtn = document.querySelector("#music-toggle");
const bgMusic = document.querySelector("#bg-music");
let isMusicPlaying = false;

function playMusic() {
    if (!bgMusic) return;
    bgMusic.volume = 0.5;
    bgMusic.play().then(() => {
        isMusicPlaying = true;
        if (musicBtn) {
            musicBtn.textContent = "⏸️ Tắt nhạc";
            musicBtn.style.borderColor = "#ff1744";
        }
    }).catch((err) => {
        console.warn("Autoplay bị chặn bởi trình duyệt:", err);
    });
}

function pauseMusic() {
    if (!bgMusic) return;
    bgMusic.pause();
    isMusicPlaying = false;
    if (musicBtn) {
        musicBtn.textContent = "🎵 Bật nhạc";
        musicBtn.style.borderColor = "rgba(255, 255, 255, 0.2)";
    }
}

if (musicBtn) {
    musicBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (isMusicPlaying) {
            pauseMusic();
        } else {
            playMusic();
        }
    });
}

// Tự động bật nhạc ở tương tác click đầu tiên bất kỳ trên trang
window.addEventListener("click", () => {
    if (!isMusicPlaying) {
        playMusic();
    }
}, { once: true });

/**************** ĐIỀU KHIỂN & ANIMATE ****************/
const controls = createControl(camera, renderer);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 80;
controls.maxDistance = 1500;

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

let timeScale = 1;
const slider = document.querySelector("#slider");
const speedValue = document.querySelector("#speed-value");

if (slider) {
    slider.addEventListener("input", () => {
        const t = slider.value / 100;
        timeScale = Math.pow(1000, t);
        if (speedValue) speedValue.textContent = timeScale.toFixed(2) + "x";
    });
}

const zoomInBtn = document.querySelector("#zoom-in");
const zoomOutBtn = document.querySelector("#zoom-out");
const zoomDir = new THREE.Vector3();

function zoomCamera(factor) {
    zoomDir.subVectors(camera.position, controls.target);
    const dist = THREE.MathUtils.clamp(zoomDir.length() * factor, controls.minDistance, controls.maxDistance);
    zoomDir.setLength(dist);
    camera.position.copy(controls.target).add(zoomDir);
    controls.update();
}

if (zoomInBtn) zoomInBtn.addEventListener("click", () => zoomCamera(0.8));
if (zoomOutBtn) zoomOutBtn.addEventListener("click", () => zoomCamera(1.25));

function animate() {
    requestAnimationFrame(animate);

    if (heartMesh) heartMesh.rotation.y += 0.005 * timeScale;
    if (photoPivot) photoPivot.rotation.y += 0.0025 * timeScale;
    background.rotation.y += 0.0002;

    controls.update();
    composer.render();
}

animate();
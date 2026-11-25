# Mindustry atlas

Plain HTML/CSS/JS. Run `python -m http.server` in this folder and open http://localhost:8000 to see the randomized 3D cube pile tumble and settle, with occasional world-space Flare flybys that cast temporary shadows across the cubes. Opening `index.html` directly (`file://`) cannot load the 3D ES modules in modern browsers, so it uses the randomized 2D fallback instead. Unavailable WebGL also uses that fallback.

Deploy on GitHub Pages: push this folder to a repo, then Settings > Pages > Deploy from a branch > main, folder `/ (root)`.

@echo off
set GIT_AUTHOR_NAME="juan angel"
set GIT_AUTHOR_EMAIL="juan.angel@murciaeduca.es"
set GIT_COMMITTER_NAME="juan angel"
set GIT_COMMITTER_EMAIL="juan.angel@murciaeduca.es"

echo Guardando cambios...
git add .
git commit -m "Actualizacion automatica desde Antigravity"

echo Subiendo a GitHub y Netlify...
git push origin main
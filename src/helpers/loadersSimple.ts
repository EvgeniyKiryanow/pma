export function showLoader(message = '⏳ Генерація шаблону...') {
    const loader = document.createElement('div');
    loader.id = 'docx-loader';
    loader.style.position = 'fixed';
    loader.style.top = '0';
    loader.style.left = '0';
    loader.style.width = '100%';
    loader.style.height = '100%';
    loader.style.background = 'rgba(0,0,0,0.4)';
    loader.style.color = 'white';
    loader.style.fontSize = '20px';
    loader.style.display = 'flex';
    loader.style.alignItems = 'center';
    loader.style.justifyContent = 'center';
    loader.style.zIndex = '9999';
    loader.innerText = message;
    document.body.appendChild(loader);
}

export function hideLoader() {
    const loader = document.getElementById('docx-loader');
    if (loader) loader.remove();
}

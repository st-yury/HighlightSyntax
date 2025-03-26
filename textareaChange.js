
function checkTextarea() {

    const sourceCodeTextarea = document.getElementById('csharp_source_code');
    const htmlTextArea = document.getElementById('csharp_source_code_converted_into_html');
    const highlightButton = document.getElementById('highlightButtonId');
    let previewOutputDiv = document.getElementById('previewOutput');
    
    if (sourceCodeTextarea.value.trim() !== '') {
        highlightButton.removeAttribute('disabled');
    } else {
        highlightButton.setAttribute('disabled', 'true');
        htmlTextArea.value = "";
        previewOutputDiv.style.display = 'none';
    }
}
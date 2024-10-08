document.addEventListener('DOMContentLoaded', () => {
    // Load prompts from localStorage on initial page load
    const storedPrompts = JSON.parse(localStorage.getItem('prompts') || '[]');
    if (storedPrompts.length > 0) {
        console.log('Stored prompts:', storedPrompts);
        populatePromptSelect(storedPrompts);
    }

    // This will now be handled by the 'prompts-loaded' event
    // loadPrompts() is no longer needed here
});

document.addEventListener('DOMContentLoaded', () => {
    const apiKey = localStorage.getItem('apiKey');
    if (apiKey) {
        document.getElementById('apiKey').value = apiKey;
        document.getElementById('generatePost').disabled = false;
        document.getElementById('apiKeySection').style.display = 'none';
        document.getElementById('removeApiKey').style.display = 'block';
    } else {
        document.getElementById('apiKeyAlert').style.display = 'block';
    }
});

document.getElementById('saveApiKey').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKey').value;
    localStorage.setItem('apiKey', apiKey);
    document.getElementById('generatePost').disabled = !apiKey;
    if (apiKey) {
        document.getElementById('apiKeyAlert').style.display = 'none';
        document.getElementById('apiKeySection').style.display = 'none';
        document.getElementById('removeApiKey').style.display = 'block';
    }
});

document.getElementById('removeApiKey').addEventListener('click', () => {
    localStorage.removeItem('apiKey');
    document.getElementById('apiKey').value = '';
    document.getElementById('generatePost').disabled = true;
    document.getElementById('apiKeyAlert').style.display = 'block';
    document.getElementById('apiKeySection').style.display = 'block';
    document.getElementById('removeApiKey').style.display = 'none';
});

document.getElementById('promptsFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const csvData = e.target.result;
            // console.log('CSV Data:', csvData); // Debug log
            window.electronAPI.parseCSV(csvData, async (results) => {
                try {
                    // console.log('Parsed CSV Results:', results); // Debug log
                    if (!Array.isArray(results) || results.length === 0) {
                        throw new Error('Parsed results data is undefined');
                    }
                    const prompts = results.slice(1).map(row => ({
                        id: row[0],
                        label: row[1],
                        prompt: row[2].replace(/\\n/g, '\n') // Replace escaped \n with actual newline
                    }));
                    // console.log('Parsed prompts from CSV:', prompts); // Debug log
                    await window.electronAPI.savePrompts(prompts);
                    populatePromptSelect(prompts);
                } catch (error) {
                    console.error('Error saving prompts:', error);
                }
            });
        };
        reader.readAsText(file);
    }
});

document.getElementById('templatesFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const csvData = e.target.result;
            // console.log('CSV Data:', csvData); // Debug log
            window.electronAPI.parseCSV(csvData, async (results) => {
                try {
                    // console.log('Parsed CSV Results:', results); // Debug log
                    if (!Array.isArray(results) || results.length === 0) {
                        throw new Error('Parsed results data is undefined');
                    }
                    const templates = results.slice(1).map(row => ({
                        prompt_id: row[0],
                        label: row[1],
                        template: row[2]
                    }));
                    // console.log('Parsed templates from CSV:', templates); // Debug log
                    await window.electronAPI.saveTemplates(templates);
                } catch (error) {
                    console.error('Error saving templates:', error);
                }
            });
        };
        reader.readAsText(file);
    }
});

document.getElementById('promptSelect').addEventListener('change', async (event) => {
    const selectedPromptId = event.target.value;
    if (!selectedPromptId) {
        document.getElementById('selectedPrompt').innerText = '';
        document.getElementById('templateSelect').innerHTML = '<option value="">--Select a template--</option>';
        return;
    }
    const prompts = JSON.parse(localStorage.getItem('prompts')) || [];
    const selectedPrompt = prompts.find(prompt => prompt.dataValues.id === selectedPromptId);
    console.log('Selected prompt:', selectedPrompt);
    if (selectedPrompt) {
        document.getElementById('selectedPrompt').dataset.originalPrompt = selectedPrompt.dataValues.promptContent; // Changed from prompt to description
        updatePromptDisplay(selectedPrompt.dataValues.promptContent);
    }
    const templates = await window.electronAPI.getTemplates(selectedPromptId);
    populateTemplateSelect(templates);
});

document.getElementById('templateSelect').addEventListener('change', (event) => {
    const selectedTemplate = event.target.value;
    const originalPrompt = document.getElementById('selectedPrompt').dataset.originalPrompt;
    let updatedPrompt = originalPrompt.replace('{template}', selectedTemplate || '{template}');
    const userInput = document.getElementById('userInput').value;
    updatedPrompt = updatedPrompt.replace(/{input}/g, userInput || '{input}');
    updatePromptDisplay(updatedPrompt);
});

document.getElementById('userInput').addEventListener('input', (event) => {
    const userInput = event.target.value;
    const originalPrompt = document.getElementById('selectedPrompt').dataset.originalPrompt;
    const selectedTemplate = document.getElementById('templateSelect').value;
    let updatedPrompt = originalPrompt.replace('{template}', selectedTemplate || '{template}');
    updatedPrompt = updatedPrompt.replace(/{input}/g, userInput || '{input}');
    updatePromptDisplay(updatedPrompt);
});

document.getElementById('generatePost').addEventListener('click', async () => {
    const originalPrompt = document.getElementById('selectedPrompt').dataset.originalPrompt;
    const selectedTemplate = document.getElementById('templateSelect').value;
    const userInput = document.getElementById('userInput').value;
    const apiKey = document.getElementById('apiKey').value; // Get the API key from the input field

    let prompt = originalPrompt.replace('{template}', selectedTemplate || '{template}');
    prompt = prompt.replace(/{input}/g, userInput || '{input}');

    try {
        const generatedPost = await window.electronAPI.generatePost(prompt, apiKey); // Pass the API key
        console.log('Generated post:', generatedPost); // Debug log
        document.getElementById('generatedPost').innerText = generatedPost.content;
    } catch (error) {
        console.error('Error generating post:', error);
    }
});

document.getElementById('clearDatabase').addEventListener('click', async () => {
    try {
        await window.electronAPI.clearDatabase();
        document.getElementById('promptSelect').innerHTML = '<option value="">--Select a prompt--</option>';
        document.getElementById('templateSelect').innerHTML = '<option value="">--Select a template--</option>';
        document.getElementById('selectedPrompt').innerText = '';
        document.getElementById('generatedPost').innerText = '';
        document.getElementById('userInput').value = '';
        console.log('Database cleared successfully');
    } catch (error) {
        console.error('Error clearing database:', error);
    }
});

// This event listener will handle both initial load and updates
window.electronAPI.on('prompts-loaded', (prompts) => {
    console.log('Received prompts:', prompts); 
    populatePromptSelect(prompts);
});

// Update the fetchNotionData event listener
document.getElementById('fetchNotionData').addEventListener('click', async () => {
    try {
        await window.electronAPI.syncNotionData();
        const prompts = await window.electronAPI.getPrompts();
        console.log('Prompts:', prompts);
        populatePromptSelect(prompts);
        console.log('Notion data fetched and database updated');
    } catch (error) {
        console.error('Error fetching Notion data:', error);
    }
});

// Update this function to handle both initial load and updates
function populatePromptSelect(prompts) {
    const promptSelect = document.getElementById('promptSelect');
    promptSelect.innerHTML = '<option value="">--Select a prompt--</option>';
    prompts.forEach((prompt) => {
        prompt = prompt.dataValues;
        const option = document.createElement('option');
        option.value = prompt.id;
        option.textContent = prompt.title;
        promptSelect.appendChild(option);
    });
    // Store prompts in localStorage for later use
    localStorage.setItem('prompts', JSON.stringify(prompts));
    console.log('Populated prompt select with', prompts.length, 'prompts');
}

function populateTemplateSelect(templates) {
    const templateSelect = document.getElementById('templateSelect');
    templateSelect.innerHTML = '<option value="">--Select a template--</option>';
    templates.forEach((template) => {
        const option = document.createElement('option');
        option.value = template.content; // Changed from template.template to template.content
        option.text = template.title; // Changed from template.label to template.title
        templateSelect.appendChild(option);
    });
    // console.log('Populated template select:', templateSelect.innerHTML); // Debug log
}

function updatePromptDisplay(prompt) {
    // Replace \n with actual newlines for innerText
    const formattedPrompt = prompt.replace(/\\n/g, '\n');
    document.getElementById('selectedPrompt').innerText = formattedPrompt;
}

// Function to populate the select element with prompts
function populatePrompts(prompts) {
    const promptSelect = document.getElementById('promptSelect');
    promptSelect.innerHTML = '';
    prompts.forEach(prompt => {
        prompt = prompt.dataValues;
        const option = document.createElement('option');
        option.value = prompt.id;
        option.textContent = prompt.title;
        promptSelect.appendChild(option);
    });
}

// Load prompts when the app starts
window.electronAPI.on('prompts-loaded', (prompts) => {
    populatePrompts(prompts);
});
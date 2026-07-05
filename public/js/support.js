document.addEventListener('DOMContentLoaded', function() {
  const form = document.querySelector('.support-form');
  if (form) {
    form.addEventListener('submit', handleSupportSubmit);
  }
});

async function handleSupportSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const inputs = form.querySelectorAll('input, textarea');
  const data = {
    name: inputs[0].value,
    email: inputs[1].value,
    subject: inputs[2].value,
    message: inputs[3].value,
    timestamp: new Date().toISOString()
  };

  try {
    const response = await fetch('/api/support', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      showToast('Support request sent successfully', 'success');
      form.reset();
    } else {
      showToast('Failed to send support request', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    // Save locally if server fails
    const requests = JSON.parse(localStorage.getItem('supportRequests') || '[]');
    requests.push(data);
    localStorage.setItem('supportRequests', JSON.stringify(requests));
    showToast('Support request saved locally', 'success');
    form.reset();
  }
}

window.handleSupportSubmit = handleSupportSubmit;

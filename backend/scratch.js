fetch('http://localhost:3000/api/hotels/e36e6944-805d-4cbf-add2-a9f6a1816d9e/availability?checkIn=2026-09-23&checkOut=2026-09-24&guests=5&rooms=3')
.then(r => r.text())
.then(t => console.log("API returned:", t))
.catch(console.error);

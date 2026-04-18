/* ============================================================
   CYBERSECURITY AD AUDIT - OFFLINE ANALYZER LOGIC
   ============================================================ */

   const dropZone = document.getElementById('drop-zone');
   const fileInput = document.getElementById('file-input');
   const dashboard = document.getElementById('dashboard');
   const uploadPanel = document.getElementById('upload-panel');
   
   // Drag and Drop Effects
   dropZone.addEventListener('dragover', (e) => {
     e.preventDefault();
     dropZone.classList.add('dragover');
   });
   
   dropZone.addEventListener('dragleave', (e) => {
     e.preventDefault();
     dropZone.classList.remove('dragover');
   });
   
   dropZone.addEventListener('drop', (e) => {
     e.preventDefault();
     dropZone.classList.remove('dragover');
     if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
   });
   
   fileInput.addEventListener('change', (e) => {
     if (e.target.files.length) handleFile(e.target.files[0]);
   });
   
   // Parse File Function
   function handleFile(file) {
     if (!file.name.endsWith('.json')) {
       alert('Only JSON files are supported for offline analysis.');
       return;
     }
     
     const reader = new FileReader();
     reader.onload = (event) => {
       try {
         const data = JSON.parse(event.target.result);
         analyzeADData(data);
       } catch (error) {
         alert('Failed to parse JSON file. Ensure it is valid JSON format.');
         console.error(error);
       }
     };
     reader.readAsText(file);
   }
   
   // Offline Analysis Logic
   function analyzeADData(data) {
     let vulnerabilities = [];
     let totalEntities = 0;
     
     // Analyze Users
     if (data.users && Array.isArray(data.users)) {
       totalEntities += data.users.length;
       data.users.forEach(user => {
         const props = user.Properties || {};
         const name = props.name || 'Unknown User';
         const isHighPriv = props.admincount === 1;
         
         // 1. Kerberoasting (HasSPN = true)
         if (props.hasspn) {
           vulnerabilities.push({
             severity: isHighPriv ? 'critical' : 'high',
             entity: name,
             vulnerability: 'Kerberoasting Possible (HasSPN)',
             mitigation: 'Implement Managed Service Accounts (gMSA) or rotating complex passwords (64+ chars) for service accounts to prevent offline cracking.'
           });
         }
         
         // 2. AS-REP Roasting (DontRequirePreAuth = true)
         if (props.dontreqpreauth) {
           vulnerabilities.push({
             severity: isHighPriv ? 'critical' : 'high',
             entity: name,
             vulnerability: 'AS-REP Roasting (No PreAuth)',
             mitigation: 'Configure the account in AD to "Require Kerberos preauthentication" preventing attackers from requesting a TGT offline.'
           });
         }
         
         // 3. Unconstrained Delegation
         if (props.unconstraineddelegation) {
           vulnerabilities.push({
             severity: 'critical',
             entity: name,
             vulnerability: 'Unconstrained Delegation configuration',
             mitigation: 'Switch to Constrained or Resource-Based Constrained Delegation (RBCD). This user can steal tickets for any passing service.'
           });
         }
         
         // 4. Stale/No Password Expiration
         // Using simplified logic for demo: Password age 0 or excessively old
         if (props.pwdlastset === 0 || props.passwordnotreqd) {
           vulnerabilities.push({
             severity: 'medium',
             entity: name,
             vulnerability: 'Password Never Expires or Not Required',
             mitigation: 'Audit accounts for stale lifecycle. Enforce a domain password policy with max age requirements, especially for Admin tiers.'
           });
         }
         
         // 5. Hardcoded Credentials in Description
         if (props.description && props.description.toLowerCase().includes('password')) {
             vulnerabilities.push({
               severity: 'high',
               entity: name,
               vulnerability: 'Password Exposed in Description',
               mitigation: 'Review and wipe AD Object descriptions for plain-text secrets. Enforce policies against writing credentials to AD properties.'
             });
         }
       });
     }
     
     // Analyze Computers
     if (data.computers && Array.isArray(data.computers)) {
       totalEntities += data.computers.length;
       data.computers.forEach(comp => {
         const props = comp.Properties || {};
         const name = props.name || 'Unknown Computer';
         
         // 1. Unconstrained Delegation
         if (props.unconstraineddelegation) {
           vulnerabilities.push({
             severity: 'critical',
             entity: name,
             vulnerability: 'Unconstrained Delegation Enabled',
             mitigation: 'If compromised, attackers can extract TGTs for any user connecting to this machine. Move to Resource-Based Constrained Delegation.'
           });
         }
         
         // 2. Missing LAPS (Local Administrator Password Solution)
         if (props.laps === false) {
           vulnerabilities.push({
             severity: 'high',
             entity: name,
             vulnerability: 'Missing Local Admin Password Solution',
             mitigation: 'Deploy Windows LAPS to randomize local administrator passwords across workstations, mitigating lateral movement and pass-the-hash.'
           });
         }
       });
     }
     
     renderDashboard(vulnerabilities, totalEntities);
   }
   
   function renderDashboard(vulnerabilities, totalEntities) {
     document.getElementById('upload-panel').style.display = 'none';
     dashboard.style.display = 'grid';
     
     // Tally
     const critCount = vulnerabilities.filter(v => v.severity === 'critical').length;
     const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
     const medCount  = vulnerabilities.filter(v => v.severity === 'medium').length;
     
     // Animate numbers
     animateValue('stat-total', 0, totalEntities, 1000);
     animateValue('stat-crit', 0, critCount, 1000);
     animateValue('stat-high', 0, highCount, 1000);
     animateValue('stat-med', 0, medCount, 1000);
     
     // Sort by severity
     const sevMap = { 'critical': 3, 'high': 2, 'medium': 1 };
     vulnerabilities.sort((a,b) => sevMap[b.severity] - sevMap[a.severity]);
     
     // Render list
     const tbody = document.getElementById('vuln-tbody');
     tbody.innerHTML = vulnerabilities.map(v => `
       <tr>
         <td><span class="badge ${v.severity}">${v.severity}</span></td>
         <td style="font-weight: 600;">${v.entity}</td>
         <td style="color: var(--accent-main);">${v.vulnerability}</td>
         <td><div class="mitigation"><i class="fas fa-hammer" style="color: var(--accent-green)"></i> ${v.mitigation}</div></td>
       </tr>
     `).join('');
     
     if(vulnerabilities.length === 0) {
       tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 30px;">No vulnerabilities discovered in parsed AD data log.</td></tr>`;
     }
   }
   
   function resetDashboard() {
     dashboard.style.display = 'none';
     document.getElementById('upload-panel').style.display = 'block';
     document.getElementById('file-input').value = '';
   }
   
   // Simple Number Counter Animation
   function animateValue(id, start, end, duration) {
       let obj = document.getElementById(id);
       let startTimestamp = null;
       const step = (timestamp) => {
           if (!startTimestamp) startTimestamp = timestamp;
           const progress = Math.min((timestamp - startTimestamp) / duration, 1);
           obj.innerHTML = Math.floor(progress * (end - start) + start);
           if (progress < 1) {
               window.requestAnimationFrame(step);
           }
       };
       window.requestAnimationFrame(step);
   }

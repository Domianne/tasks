/****************************************************
 * 1. Lecture du fichier listes.json depuis GitHub
 ****************************************************/
async function chargerListesDepuisOneDrive() {
  const url = "https://raw.githubusercontent.com/Domianne/tasks/main/listes.json";

  try {
    const response = await fetch(url + "?t=" + Date.now());
    if (!response.ok) {
      console.error("Erreur de chargement du fichier JSON");
      return [];
    }

    return await response.json();

  } catch (e) {
    console.error("Erreur réseau ou accès GitHub :", e);
    return [];
  }
}


/****************************************************
 * 2. Variable principale
 ****************************************************/
let listes = [];


/****************************************************
 * 3. Chargement initial
 ****************************************************/
chargerListesDepuisOneDrive().then(data => {
  listes = data;
  afficherListes();
});


/****************************************************
 * 4. Sauvegarde locale (optionnelle)
 ****************************************************/
function sauvegarder() {
  localStorage.setItem("listes", JSON.stringify(listes));
}


/****************************************************
 * 5. Tri des tâches
 ****************************************************/
function trierTaches(taches) {
  const ordreEtat = { "a_faire": 0, "en_cours": 1, "fait": 2 };
  const aujourdHui = new Date().toISOString().split("T")[0];

  taches.sort((a, b) => {

    const aSansDate = !a.deadline;
    const bSansDate = !b.deadline;

    // 1. Tâches sans deadline regroupées avant les "fait"
    if (aSansDate && !bSansDate && b.etat !== "fait") return 1;
    if (bSansDate && !aSansDate && a.etat !== "fait") return -1;

    // 2. "fait" toujours en bas
    if (a.etat === "fait" && b.etat !== "fait") return 1;
    if (b.etat === "fait" && a.etat !== "fait") return -1;

    // 3. Deadline dépassée en premier
    const aDepassee = a.deadline && a.deadline < aujourdHui;
    const bDepassee = b.deadline && b.deadline < aujourdHui;

    if (aDepassee && !bDepassee) return -1;
    if (!aDepassee && bDepassee) return 1;

    // 4. Deadline future (ordre croissant)
    if (a.deadline && b.deadline) {
      return a.deadline.localeCompare(b.deadline);
    }

    // 5. État
    if (ordreEtat[a.etat] !== ordreEtat[b.etat]) {
      return ordreEtat[a.etat] - ordreEtat[b.etat];
    }

    // 6. Alphabétique
    return a.texte.localeCompare(b.texte);
  });
}


/****************************************************
 * 6. Affichage des tâches d’une liste
 ****************************************************/
function afficherTachesDansListe(listeObj, tbody) {

  tbody.innerHTML = "";
  trierTaches(listeObj.taches);

  listeObj.taches.forEach((tache, index) => {

    const tr = document.createElement("tr");

    /********** Colonne État **********/
    const tdEtat = document.createElement("td");
    tdEtat.classList.add("etat-colonne");

    const etatBtn = document.createElement("button");
    etatBtn.classList.add("etat-btn");
    etatBtn.dataset.etat = tache.etat.replace("_", " ");

    etatBtn.addEventListener("click", () => {
      let etat = etatBtn.dataset.etat;

      if (etat === "a faire") etat = "en cours";
      else if (etat === "en cours") etat = "fait";
      else etat = "a faire";

      etatBtn.dataset.etat = etat;
      tache.etat = etat.replace(" ", "_");

      sauvegarder();
      afficherListes();
    });

    tdEtat.appendChild(etatBtn);


    /********** Colonne Texte **********/
    const span = document.createElement("span");
    span.textContent = tache.texte;

    if (tache.etat === "fait") {
      span.style.textDecoration = "line-through";
      span.style.opacity = "0.6";
    } else if (tache.etat === "en_cours") {
      span.style.fontStyle = "italic";
      span.style.opacity = "0.9";
    }

    if (tache.deadline) {
      const aujourdHui = new Date().toISOString().split("T")[0];
      if (tache.deadline < aujourdHui && tache.etat !== "fait") {
        span.style.color = "red";
        span.style.fontWeight = "bold";
      }
    }

    span.addEventListener("contextmenu", (e) => {
      e.preventDefault();

      menu.style.left = e.pageX + "px";
      menu.style.top = e.pageY + "px";
      menu.style.display = "block";

      tacheCible = { obj: tache, index };
      listeCible = listeObj;

      const versTDJ = menu.querySelector('[data-action="vers-tdj"]');
      const retour = menu.querySelector('[data-action="retour"]');

      if (listeObj.speciale) {
        versTDJ.style.display = "none";
        retour.style.display = "block";
      } else {
        versTDJ.style.display = "block";
        retour.style.display = "none";
      }
    });

    const tdTexte = document.createElement("td");
    tdTexte.classList.add("tache-colonne");
    tdTexte.appendChild(span);


    /********** Colonne Date **********/
    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.value = tache.deadline || "";

    dateInput.addEventListener("change", () => {
      tache.deadline = dateInput.value;
      sauvegarder();
      afficherListes();
    });

    const tdDate = document.createElement("td");
    tdDate.classList.add("date-colonne");
    tdDate.appendChild(dateInput);


    /********** Construction **********/
    tr.appendChild(tdEtat);
    tr.appendChild(tdTexte);
    tr.appendChild(tdDate);

    tbody.appendChild(tr);
  });


  /********** Ligne d’ajout **********/
  const trInput = document.createElement("tr");

  trInput.innerHTML = `
    <td class="etat-colonne"></td>
    <td class="tache-colonne">
        <input class="nouvelle-tache" placeholder="Nouvelle tâche">
    </td>
    <td class="date-colonne"></td>
  `;

  tbody.appendChild(trInput);

  const input = trInput.querySelector(".nouvelle-tache");

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim() !== "") {
      listeObj.taches.push({
        texte: input.value.trim(),
        etat: "a_faire",
        deadline: ""
      });
      sauvegarder();
      afficherListes();
    }
  });
}


/****************************************************
 * 7. Affichage de toutes les listes
 ****************************************************/
function afficherListes() {

  const container = document.getElementById("container-listes");
  container.innerHTML = "";

  listes.forEach((listeObj, indexListe) => {

    const div = document.createElement("div");
    div.className = "liste";
    if (listeObj.speciale) div.classList.add("speciale");

    const titre = document.createElement("div");
    titre.className = "titre-liste";

    const nom = document.createElement("span");
    nom.textContent = listeObj.nom;

    const btnSupprimer = document.createElement("button");
    btnSupprimer.textContent = "×";
    btnSupprimer.className = "supprimer-liste";

    btnSupprimer.addEventListener("click", () => {
      listes.splice(indexListe, 1);
      sauvegarder();
      afficherListes();
    });

    titre.appendChild(nom);
    titre.appendChild(btnSupprimer);
    div.appendChild(titre);

    const table = document.createElement("table");
    table.className = "taches compact";
    table.innerHTML = `
      <thead>
        <tr>
          <th>État</th>
          <th>Tâche</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");
    div.appendChild(table);

    afficherTachesDansListe(listeObj, tbody);

    container.appendChild(div);
  });
}


/****************************************************
 * 8. Bouton "Nouvelle liste"
 ****************************************************/
document.getElementById("ajouter-liste").addEventListener("click", () => {
  const nom = prompt("Nom de la nouvelle liste :");
  if (!nom) return;

  listes.push({ nom, taches: [] });
  sauvegarder();
  afficherListes();
});


/****************************************************
 * 9. Menu contextuel
 ****************************************************/
let menu = document.getElementById("menu-contextuel");
let tacheCible = null;
let listeCible = null;

document.addEventListener("click", () => {
  menu.style.display = "none";
});

menu.addEventListener("click", (e) => {
  if (!tacheCible || !listeCible) return;

  const action = e.target.dataset.action;

  if (action === "supprimer") {
    listeCible.taches.splice(tacheCible.index, 1);
  }

  if (action === "vers-tdj") {
    const tdj = listes.find(l => l.speciale);
    tacheCible.obj.origine = listeCible.nom;
    listeCible.taches.splice(tacheCible.index, 1);
    tdj.taches.push(tacheCible.obj);
  }

  if (action === "retour") {
    const origine = listes.find(l => l.nom === tacheCible.obj.origine);
    if (origine) {
      const tdj = listes.find(l => l.speciale);
      tdj.taches.splice(tacheCible.index, 1);
      delete tacheCible.obj.origine;
      origine.taches.push(tacheCible.obj);
    }
  }

  sauvegarder();
  afficherListes();
  menu.style.display = "none";
});


/****************************************************
 * 10. Export JSON
 ****************************************************/
function exporterListesJSON() {
  const data = JSON.stringify(listes, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "listes.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const boutonExport = document.getElementById("exporter-json");
if (boutonExport) {
  boutonExport.addEventListener("click", exporterListesJSON);
}


/****************************************************
 * 11. Sauvegarde GitHub
 ****************************************************/
async function sauvegarderSurGitHub() {
  const token = localStorage.getItem("github_token");
  if (!token) {
    alert("Aucun token GitHub trouvé.");
    return;
  }

  const url = "https://api.github.com/repos/Domianne/tasks/contents/listes.json";

  const contenu = JSON.stringify(listes, null, 2);
  const base64 = btoa(unescape(encodeURIComponent(contenu)));

  const metadata = await fetch(url).then(r => r.json());

  const body = {
    message: "Mise à jour automatique depuis l'app",
    content: base64,
    sha: metadata.sha
  };

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (response.ok) {
    alert("Sauvegarde réussie !");
  } else {
    alert("Erreur lors de la sauvegarde.");
  }
}

document.getElementById("saveBtn").addEventListener("click", sauvegarderSurGitHub);

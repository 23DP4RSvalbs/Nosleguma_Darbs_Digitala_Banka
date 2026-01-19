<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import StatusPill from '@/components/StatusPill.vue'
import { API_BASE_URL } from '@/config/api'

const apiOk = ref(false)
const apiTime = ref<string>('')

const statusLabel = computed(() => (apiOk.value ? 'API connected' : 'API disconnected'))

onMounted(async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/health`)
    const data = await res.json()
    apiOk.value = data.status === 'ok'
    apiTime.value = data.timestamp ?? ''
  } catch {
    apiOk.value = false
    apiTime.value = ''
  }
})
</script>

<template>
  <main class="page">
    <header class="topbar">


      <nav class="nav">
        <RouterLink class="link" to="/">Home</RouterLink>
        <RouterLink class="link" to="/about">About</RouterLink>
      </nav>
    </header>

    <section class="hero">
      <div class="heroText">
        <h1>
          Banka Pro Max
    
        </h1>


        <div class="ctaRow">
          <a class="btn primary" href="#features">Uzsākt</a>
          <a class="btn primary" href="#status">Uzzināt Statusu</a>
        </div>

        <div id="status" class="statusRow">
          <StatusPill :ok="apiOk" :label="statusLabel" :detail="apiTime" />
        </div>
      </div>

      <div class="heroCard">
        <div class="cardHeader">
          <div class="cardTitle">Overview</div>
          <div class="chip">Max</div>
        </div>

        <div class="metric">
          <div class="metricLabel">Balance</div>
          <div class="metricValue">€ 12,480.00</div>
          <div class="metricHint">Biznesa konts</div>
        </div>

        <div class="divider" />

        <div class="list">
          <div class="row">
            <div class="rowLeft">
              <div class="icon gold" />
              <div>
                <div class="rowTitle">Tērēšanas statistika</div>
                <div class="rowSub">Mēneša tēriņi & Filtri</div>
              </div>
            </div>
            <div class="rowRight">→</div>
          </div>

          <div class="row">
            <div class="rowLeft">
              <div class="icon purple" />
              <div>
                <div class="rowTitle">Pārksaitījumi</div>
                <div class="rowSub">Ātras internālas sistēmas</div>
              </div>
            </div>
            <div class="rowRight">→</div>
          </div>

          <div class="row">
            <div class="rowLeft">
              <div class="icon slate" />
              <div>
                <div class="rowTitle">Drošība</div>
                <div class="rowSub">Sesija & piekļuves kontrole</div>
              </div>
            </div>
            <div class="rowRight">→</div>
          </div>
        </div>
      </div>
    </section>

    <section id="features" class="features">
      <div class="feature">
        <div class="fTitle">White-space first</div>
        <div class="fText">Minimal UI that scales as you add modules.</div>
      </div>
      <div class="feature">
        <div class="fTitle">Purple + gold accents</div>
        <div class="fText">Premium look without heavy visuals.</div>
      </div>
      <div class="feature">
        <div class="fTitle">Backend-ready</div>
        <div class="fText">API status is real; plug in endpoints next.</div>
      </div>
    </section>

    <footer class="footer">
      <div>© {{ new Date().getFullYear() }} Digital Bank</div>
      <div class="footRight">
      </div>
    </footer>
  </main>
</template>

<style scoped>
.page{
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1.25rem 3rem;
}

.topbar{
  display:flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: .75rem 0 1.5rem;
}

.brand{
  display:flex;
  gap: .85rem;
  align-items:center;
}
.mark{
  width: 42px; height: 42px;
  display:grid; place-items:center;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--purple), var(--purple-2));
  color: white;
  font-weight: 800;
  letter-spacing: .5px;
  box-shadow: 0 10px 22px rgba(109,40,217,.25);
}
.name{ font-weight: 750; letter-spacing:.2px; }
.tag{ font-size: .9rem; color: rgba(15,23,42,.55); }

.nav{ display:flex; gap: .75rem; }
.link{
  padding: .5rem .75rem;
  border-radius: 10px;
  color: rgba(15,23,42,.75);
}
.link.router-link-active{
  color: var(--text);
  background: rgba(109,40,217,.08);
  border: 1px solid rgba(109,40,217,.14);
}

.hero{
  display:grid;
  grid-template-columns: 1.15fr .85fr;
  gap: 1.5rem;
  align-items: stretch;
  margin-top: .5rem;
}
@media (max-width: 920px){
  .hero{ grid-template-columns: 1fr; }
}

.heroText{
  padding: 1.25rem 1rem;
}
h1{
  font-size: clamp(2.0rem, 4vw, 3.1rem);
  line-height: 1.05;
  margin: 0 0 .85rem;
  letter-spacing: -0.02em;
}
.accent{
  background: linear-gradient(90deg, var(--purple), var(--gold));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
p{
  margin: 0 0 1.25rem;
  color: rgba(15,23,42,.68);
  font-size: 1.05rem;
  line-height: 1.55;
  max-width: 46ch;
}
.ctaRow{ display:flex; gap:.75rem; flex-wrap: wrap; margin-bottom: 1rem; }

.btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  padding: .75rem 1rem;
  border-radius: 12px;
  border: 1px solid var(--border);
  font-weight: 600;
}
.btn.primary{
  border: none;
  color: white;
  background: linear-gradient(135deg, var(--purple), var(--purple-2));
  box-shadow: 0 12px 24px rgba(109,40,217,.18);
}
.btn.ghost{
  background: rgba(255,255,255,.65);
}

.statusRow{ margin-top: .75rem; max-width: 340px; }

.heroCard{
  border: 1px solid var(--border);
  background: var(--card);
  border-radius: 18px;
  box-shadow: var(--shadow);
  padding: 1.25rem;
  backdrop-filter: blur(12px);
}

.cardHeader{
  display:flex;
  justify-content: space-between;
  align-items:center;
  margin-bottom: 1.1rem;
}
.cardTitle{ font-weight: 700; }
.chip{
  font-size: .8rem;
  padding: .35rem .6rem;
  border-radius: 999px;
  border: 1px solid rgba(212,167,44,.35);
  background: rgba(212,167,44,.12);
  color: rgba(15,23,42,.80);
}

.metricLabel{ color: rgba(15,23,42,.55); font-size: .9rem; }
.metricValue{ font-size: 1.8rem; font-weight: 800; margin-top: .25rem; }
.metricHint{ color: rgba(15,23,42,.45); font-size: .85rem; margin-top: .2rem; }

.divider{
  height: 1px;
  background: rgba(15,23,42,.08);
  margin: 1.1rem 0;
}

.list{ display:flex; flex-direction: column; gap: .65rem; }
.row{
  display:flex;
  justify-content: space-between;
  align-items: center;
  padding: .75rem .8rem;
  border-radius: 14px;
  border: 1px solid rgba(15,23,42,.08);
  background: rgba(255,255,255,.55);
}
.rowLeft{ display:flex; gap:.75rem; align-items:center; }
.icon{ width: 12px; height: 12px; border-radius: 6px; }
.icon.gold{ background: var(--gold); box-shadow: 0 0 0 6px rgba(212,167,44,.14); }
.icon.purple{ background: var(--purple); box-shadow: 0 0 0 6px rgba(109,40,217,.14); }
.icon.slate{ background: #0f172a; box-shadow: 0 0 0 6px rgba(15,23,42,.08); }
.rowTitle{ font-weight: 650; }
.rowSub{ font-size: .85rem; color: rgba(15,23,42,.55); margin-top: .12rem; }
.rowRight{ color: rgba(15,23,42,.45); }

.features{
  display:grid;
  grid-template-columns: repeat(3, 1fr);
  gap: .9rem;
  margin-top: 1.6rem;
}
@media (max-width: 920px){
  .features{ grid-template-columns: 1fr; }
}
.feature{
  border: 1px solid rgba(15,23,42,.10);
  background: rgba(255,255,255,.65);
  border-radius: 18px;
  padding: 1rem 1.05rem;
}
.fTitle{ font-weight: 700; }
.fText{ margin-top: .35rem; color: rgba(15,23,42,.65); line-height: 1.45; }

.footer{
  margin-top: 2.2rem;
  padding-top: 1.4rem;
  border-top: 1px solid rgba(15,23,42,.08);
  display:flex;
  justify-content: space-between;
  gap: 1rem;
  color: rgba(15,23,42,.55);
  font-size: .92rem;
}
.footRight{ display:flex; align-items:center; gap:.5rem; }
.dotPurple{
  width: 8px; height: 8px; border-radius: 999px;
  background: var(--purple);
}
</style>

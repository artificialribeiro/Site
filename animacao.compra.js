/**
 * Boutique Diniz - Experiência de Finalização de Pedido
 * Este script injeta as fontes, o CSS, a estrutura HTML e a lógica da animação
 * diretamente na página onde for importado.
 */

(function() {
  // 1. Injetar Fontes do Google na Página
  const loadFonts = () => {
    const preconnect1 = document.createElement('link');
    preconnect1.rel = 'preconnect';
    preconnect1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(preconnect1);

    const preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = 'anonymous';
    document.head.appendChild(preconnect2);

    const fontStyle = document.createElement('link');
    fontStyle.rel = 'stylesheet';
    fontStyle.href = 'https://fonts.googleapis.com/css2?family=Great+Vibes&family=Montserrat:wght@200;300;400;500&display=swap';
    document.head.appendChild(fontStyle);
  };

  // 2. Injetar todo o CSS isolado
  const loadCSS = () => {
    const style = document.createElement('style');
    style.innerHTML = `
      :root {
        --bg-deep: #050505;
        --bg-ambient: #121212;
        --white-pure: #ffffff;
        --white-muted: #d0d0d0;
        --store-accent: #1a1a1a;
      }

      /* Container Principal (Substitui o Body para ser modular) */
      #boutique-anim-container {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        background: radial-gradient(circle at top, var(--bg-ambient) 0%, var(--bg-deep) 100%);
        font-family: 'Montserrat', sans-serif;
        color: var(--white-pure);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        z-index: 99999; /* Garante que fique por cima da sua página */
      }

      #boutique-anim-container * { 
        box-sizing: border-box; 
        margin: 0; 
        padding: 0; 
      }

      /* --- TELA INICIAL (UI) --- */
      .ui-layer {
        z-index: 20;
        display: flex;
        flex-direction: column;
        align-items: center;
        transition: all 0.8s cubic-bezier(0.25, 1, 0.5, 1);
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
      }
      .ui-layer.hidden {
        opacity: 0;
        pointer-events: none;
        transform: translate(-50%, -80%) scale(0.9);
      }

      .brand-hero { text-align: center; margin-bottom: 40px; }
      .brand-main {
        font-family: 'Great Vibes', cursive;
        font-size: 5rem;
        line-height: 0.9;
        color: var(--white-pure);
        text-shadow: 0 4px 15px rgba(255,255,255,0.2);
      }
      .brand-sub {
        font-family: 'Montserrat', sans-serif;
        font-size: 0.8rem;
        font-weight: 300;
        letter-spacing: 10px;
        margin-top: 10px;
        color: var(--white-muted);
        text-transform: uppercase;
      }

      .ui-layer button {
        padding: 16px 40px;
        font-family: 'Montserrat', sans-serif;
        font-size: 0.9rem;
        letter-spacing: 3px;
        text-transform: uppercase;
        color: #000;
        background: var(--white-pure);
        border: none;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        transition: all 0.4s;
      }
      .ui-layer button::after {
        content: '';
        position: absolute;
        top: 0; left: -100%; width: 50%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
        transform: skewX(-20deg);
        transition: 0.5s;
      }
      .ui-layer button:hover::after { left: 150%; }
      .ui-layer button:hover { box-shadow: 0 0 20px rgba(255,255,255,0.4); transform: translateY(-2px); }

      /* --- CENA PRINCIPAL --- */
      .scene {
        position: absolute;
        inset: 0;
        opacity: 0;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        transition: opacity 1.5s ease;
        z-index: 5;
      }
      .scene.active { opacity: 1; }

      /* --- CENÁRIO QUE SE MOVE (LOJA E POSTES) --- */
      .world-layer {
        position: absolute;
        bottom: 120px;
        left: 0;
        width: 100vw;
        height: 60vh;
        display: flex;
        align-items: flex-end;
        transform: translateX(0);
        transition: transform 6s linear;
      }

      .scene.state-journey .world-layer,
      .scene.state-leave .world-layer,
      .scene.state-done .world-layer {
        transform: translateX(-150vw);
      }

      /* A LOJA FÍSICA */
      .store-building {
        position: absolute;
        left: 45vw;
        transform: translateX(-40%);
        width: 450px;
        height: 350px;
        border: 1px solid #222;
        border-bottom: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        padding-bottom: 20px;
      }
      .store-signboard { position: absolute; top: 30px; text-align: center; }
      .store-signboard h1 {
        font-family: 'Great Vibes', cursive;
        font-size: 3.5rem; color: #fff; line-height: 0.8;
        text-shadow: 0 0 15px rgba(255,255,255,0.5);
      }
      .store-signboard p {
        font-family: 'Montserrat', sans-serif;
        font-size: 0.5rem; letter-spacing: 6px; color: #888;
        margin-top: 10px; text-transform: uppercase;
      }
      .store-awning {
        position: absolute; bottom: 150px; width: 110%; height: 50px;
        background: repeating-linear-gradient(100deg, #111, #111 20px, #2a2a2a 20px, #2a2a2a 40px);
        border-radius: 5px; box-shadow: 0 15px 30px rgba(0,0,0,0.9); z-index: 2;
      }
      .store-front { display: flex; gap: 20px; width: 90%; height: 140px; z-index: 1; }
      .window-display { flex: 1; border: 2px solid #333; border-bottom: none; background: radial-gradient(circle at bottom, rgba(255, 245, 230, 0.1) 0%, transparent 70%); position: relative; }
      .door { width: 80px; border: 2px solid #444; border-bottom: none; background: #050505; position: relative; }
      .door::before { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to top, rgba(255,255,255,0.05), transparent); }
      .mannequin-sil { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 20px; height: 90px; background: #000; border-radius: 10px 10px 0 0; }

      /* POSTES DE LUZ NA VIAGEM */
      .passing-light { position: absolute; bottom: 0; width: 6px; height: 250px; background: #222; z-index: 0; }
      .passing-light::after { content: ''; position: absolute; top: -10px; left: -20px; width: 40px; height: 20px; background: #fff; border-radius: 10px 10px 0 0; box-shadow: 0 0 40px rgba(255,255,255,0.3); }
      .pl-1 { left: 120vw; } .pl-2 { left: 180vw; } .pl-3 { left: 240vw; }

      /* --- RUA --- */
      .road-container {
        position: absolute; bottom: 0; width: 100%; height: 120px;
        background: #080808; border-top: 1px solid #333; z-index: 2; overflow: hidden;
      }
      .road-lines {
        position: absolute; top: 50%; left: 0; width: 200%; height: 4px;
        background: repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(255,255,255,0.5) 60px, rgba(255,255,255,0.5) 120px);
      }
      .scene.state-journey .road-lines { animation: roadScroll 0.6s linear infinite; }

      /* --- VEÍCULO (A VAN) --- */
      .van-wrapper {
        position: absolute;
        bottom: 95px;
        left: 0;
        transform: translateX(-100vw);
        transition: transform 2.5s cubic-bezier(0.25, 1, 0.4, 1);
        z-index: 10;
      }
      
      .scene.state-arrive .van-wrapper,
      .scene.state-loading .van-wrapper,
      .scene.state-journey .van-wrapper {
        transform: translateX(40vw);
      }
      
      .scene.state-leave .van-wrapper,
      .scene.state-done .van-wrapper {
        transform: translateX(150vw);
        transition: transform 3s cubic-bezier(0.5, 0, 0.2, 1);
      }

      .van-chassis {
        position: relative;
        width: 380px; height: 140px;
        transform-origin: bottom center;
        transition: transform 0.4s;
      }
      .scene.state-loading .van-chassis { transform: translateY(5px); }
      .scene.state-journey .van-chassis { animation: vanBump 0.8s ease-in-out infinite; }

      .van-body {
        position: absolute; bottom: 25px; left: 0; width: 360px; height: 125px;
        background: linear-gradient(to bottom, #141414, #000); border: 1px solid rgba(255,255,255,0.15);
        border-radius: 10px 40px 10px 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.9);
      }
      .van-door {
        position: absolute; top: 15px; left: 50px; width: 140px; height: 95px;
        border: 1px solid rgba(255,255,255,0.05); border-radius: 4px;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
      }
      .v-logo { font-family: 'Great Vibes', cursive; font-size: 2rem; color: #fff; line-height: 0.8;}
      .v-sub { font-family: 'Montserrat', sans-serif; font-size: 0.35rem; letter-spacing: 3px; color: #888; margin-top: 5px;}
      .van-window { position: absolute; top: 18px; right: 15px; width: 80px; height: 45px; background: #111; border: 2px solid #333; border-radius: 5px 20px 5px 5px; }
      .headlight { position: absolute; bottom: 25px; right: -2px; width: 6px; height: 20px; background: #fff; box-shadow: 0 0 15px #fff; }
      .headlight-beam {
        position: absolute; top: 50%; right: -350px; transform: translateY(-50%); width: 350px; height: 100px;
        background: linear-gradient(to right, rgba(255,255,255,0.15), transparent); clip-path: polygon(0 45%, 100% 0, 100% 100%, 0 55%);
        opacity: 0; transition: opacity 0.5s;
      }
      .scene.state-arrive .headlight-beam, .scene.state-journey .headlight-beam, .scene.state-leave .headlight-beam { opacity: 1; }

      .wheel {
        position: absolute; bottom: 0; width: 50px; height: 50px; background: #050505; border: 4px solid #1a1a1a;
        border-radius: 50%; box-shadow: 0 5px 10px #000; display: flex; align-items: center; justify-content: center;
      }
      .wheel-rim { width: 24px; height: 24px; border: 2px solid #ccc; border-radius: 50%; position: relative; }
      .wheel-rim::before, .wheel-rim::after { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #ccc; }
      .wheel-rim::before { width: 100%; height: 2px; } .wheel-rim::after { width: 2px; height: 100%; }
      .w-back { left: 40px; } .w-front { right: 50px; }

      .scene.state-arrive .wheel, .scene.state-leave .wheel { animation: spinRim 0.6s linear infinite; }
      .scene.state-journey .wheel { animation: spinRim 0.3s linear infinite; } 

      /* --- SACOLAS --- */
      .bags-area { position: absolute; top: -20px; left: 15px; width: 150px; height: 120px; overflow: hidden; z-index: -1; }
      .bag { position: absolute; bottom: 25px; width: 28px; height: 38px; background: #fff; border-radius: 2px; box-shadow: -2px 2px 8px rgba(0,0,0,0.8); opacity: 0; }
      .bag::before { content: 'BD'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-family: 'Great Vibes'; font-size: 12px; color: #000; }
      .bag::after { content: ''; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); width: 10px; height: 10px; border: 1px solid #333; border-bottom: none; border-radius: 50% 50% 0 0; }
      .b1 { left: 30px; } .b2 { left: 65px; z-index: 2; } .b3 { left: 100px; }

      .scene.state-loading .b1 { animation: loadBag 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards 0.2s; }
      .scene.state-loading .b2 { animation: loadBag 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards 0.8s; }
      .scene.state-loading .b3 { animation: loadBag 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards 1.4s; }

      /* --- TEXTOS DE STATUS --- */
      .status-text {
        position: absolute; top: 20%; left: 50%; transform: translateX(-50%);
        font-family: 'Montserrat', sans-serif; font-size: 1.2rem; letter-spacing: 5px;
        color: var(--white-pure); text-transform: uppercase; opacity: 0; transition: opacity 0.5s;
      }
      .scene.state-loading .status-text::after { content: 'Coletando Pedido...'; }
      .scene.state-journey .status-text::after { content: 'Iniciando Rota...'; }
      .scene.state-loading .status-text, .scene.state-journey .status-text { opacity: 1; }

      /* --- TELA PRETA FINAL --- */
      .black-overlay {
        position: absolute; inset: 0;
        background: #000000;
        z-index: 100;
        opacity: 0; pointer-events: none;
        transition: opacity 1.5s ease;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
      }
      .scene.state-done .black-overlay {
        opacity: 1; pointer-events: all;
      }
      
      .final-brand {
        font-family: 'Great Vibes', cursive;
        font-size: 4rem; color: #fff;
        transform: translateY(20px); transition: transform 1.5s ease;
      }
      .final-msg {
        font-family: 'Montserrat', sans-serif;
        font-size: 1.5rem; letter-spacing: 6px; color: #ccc;
        text-transform: uppercase; margin-top: 15px;
        transform: translateY(20px); transition: transform 1.5s ease 0.3s;
        text-align: center;
      }
      .scene.state-done .final-brand, 
      .scene.state-done .final-msg {
        transform: translateY(0);
      }

      /* --- KEYFRAMES --- */
      @keyframes spinRim { to { transform: rotate(360deg); } }
      @keyframes loadBag {
        0% { opacity: 0; transform: translate(100px, -150px) rotate(20deg); } 
        100% { opacity: 1; transform: translate(0, 0) rotate(0deg); }
      }
      @keyframes roadScroll {
        from { transform: translateX(0); }
        to { transform: translateX(-120px); } 
      }
      @keyframes vanBump {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-3px); }
      }

      @media (max-width: 768px) {
        .brand-main { font-size: 3.5rem; }
        .van-wrapper { transform: scale(0.7) translateX(-150vw); bottom: 105px; }
        .scene.state-arrive .van-wrapper, .scene.state-loading .van-wrapper, .scene.state-journey .van-wrapper { transform: scale(0.7) translateX(30vw); }
        .scene.state-leave .van-wrapper, .scene.state-done .van-wrapper { transform: scale(0.7) translateX(200vw); }
        .store-building { transform: scale(0.6) translateX(-60%); bottom: -20px;}
        .final-msg { font-size: 1rem; }
      }
    `;
    document.head.appendChild(style);
  };

  // 3. Injetar o HTML e Iniciar a Lógica
  const buildHTMLAndLogic = () => {
    const container = document.createElement('div');
    container.id = 'boutique-anim-container';
    
    container.innerHTML = `
      <div class="ui-layer" id="bd-uiLayer">
        <div class="brand-hero">
          <div class="brand-main">Boutique Diniz</div>
          <div class="brand-sub">Moda Feminina</div>
        </div>
        <button id="bd-btnOrder">Confirmar Pedido</button>
      </div>

      <div class="scene" id="bd-scene">
        <div class="status-text"></div>

        <div class="world-layer">
          <div class="store-building">
            <div class="store-signboard">
              <h1>Boutique Diniz</h1><p>Maison de Moda</p>
            </div>
            <div class="store-awning"></div>
            <div class="store-front">
              <div class="window-display"><div class="mannequin-sil"></div></div>
              <div class="door"></div>
            </div>
          </div>
          <div class="passing-light pl-1"></div>
          <div class="passing-light pl-2"></div>
          <div class="passing-light pl-3"></div>
        </div>

        <div class="van-wrapper">
          <div class="van-chassis">
            <div class="bags-area">
              <div class="bag b1"></div><div class="bag b2"></div><div class="bag b3"></div>
            </div>
            <div class="van-body">
              <div class="van-door">
                <div class="v-logo">Boutique Diniz</div><div class="v-sub">MODA FEMININA</div>
              </div>
              <div class="van-window"></div>
            </div>
            <div class="headlight"><div class="headlight-beam"></div></div>
            <div class="wheel w-back"><div class="wheel-rim"></div></div>
            <div class="wheel w-front"><div class="wheel-rim"></div></div>
          </div>
        </div>

        <div class="road-container"><div class="road-lines"></div></div>

        <!-- TELA PRETA NO FINAL -->
        <div class="black-overlay">
          <div class="final-brand">Boutique Diniz</div>
          <div class="final-msg">Pedido Sendo Preparado</div>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    // --- LÓGICA DE EVENTOS ---
    const btn = document.getElementById('bd-btnOrder');
    const ui = document.getElementById('bd-uiLayer');
    const scene = document.getElementById('bd-scene');

    btn.addEventListener('click', () => {
      btn.disabled = true;
      ui.classList.add('hidden');
      scene.classList.add('active');

      // 1. Van entra
      scene.classList.add('state-arrive');

      // 2. Coletando os pacotes
      setTimeout(() => {
        scene.classList.add('state-loading');
      }, 2500);

      // 3. Van acelera (Viagem)
      setTimeout(() => {
        scene.classList.remove('state-loading');
        scene.classList.add('state-journey');
      }, 5500);

      // 4. Van vai embora da tela
      setTimeout(() => {
        scene.classList.remove('state-journey');
        scene.classList.add('state-leave');
      }, 10500);

      // 5. Escurece e trava na tela final "Preparando Pedido" (Fica Fixo)
      setTimeout(() => {
        scene.classList.add('state-done');
      }, 13000);
    });
  };

  // 4. Inicialização Segura (Garante que rode após a página carregar)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      loadFonts();
      loadCSS();
      buildHTMLAndLogic();
    });
  } else {
    loadFonts();
    loadCSS();
    buildHTMLAndLogic();
  }

})();




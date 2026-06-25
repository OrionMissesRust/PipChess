(function () {
  let removed = false;
  let instance; 

  const SQUARE_SIZE = 26;
  const BOARD_X = 20;
  const BOARD_Y = 52;
  const BASE_COLOR = 3;       
  const HIGHLIGHT_COLOR = 2;  

  let board = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'], 
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'], 
    ['.', '.', '.', '.', '.', '.', '.', '.'], 
    ['.', '.', '.', '.', '.', '.', '.', '.'], 
    ['.', '.', '.', '.', '.', '.', '.', '.'], 
    ['.', '.', '.', '.', '.', '.', '.', '.'], 
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'], 
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']  
  ];

  let initialTargets = [];
  for (let i = 0; i < 8; i++) {
    initialTargets.push([false, false, false, false, false, false, false, false]);
  }

  const state = {
    phase: "MAIN_MENU", menuSelection: 0, winner: "", turn: "WHITE",             
    cursorRow: 6, cursorCol: 0, originRow: -1, originCol: -1,
    statusMessage: "PICK PIECE", checkPlayer: "", validTargets: initialTargets,
    promoRow: -1, promoCol: -1, wKingR: 7, wKingC: 4, bKingR: 0, bKingC: 4,
    wKingMoved: false, wRookAMoved: false, wRookHMoved: false,
    bKingMoved: false, bRookAMoved: false, bRookHMoved: false,
    epTargetCol: -1,
    loneKingMoves: 0,  // Tracks consecutive moves made while a lone king exists
    drawReason: ""     // Stores "STALEMATE" or "15_MOVE_RULE" for UI readout
  };

  function playSound(type) {
    if (Pip.playSound) { try { Pip.playSound(type); } catch (e) {} }
  }

  function isPlayerPiece(char, player) {
    if (char === '.') return false;
    return player === "WHITE" ? (char === char.toUpperCase()) : (char !== char.toUpperCase());
  }

  function clearValidMovesCache() {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) state.validTargets[r][c] = false;
    }
  }

  function calculateValidMovesCache(or, oc, piece) {
    clearValidMovesCache();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        state.validTargets[r][c] = isValidMove(or, oc, r, c, piece, false);
      }
    }
  }

  function resetGame() {
    board = [
      ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'], ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'], 
      ['.', '.', '.', '.', '.', '.', '.', '.'], ['.', '.', '.', '.', '.', '.', '.', '.'], 
      ['.', '.', '.', '.', '.', '.', '.', '.'], ['.', '.', '.', '.', '.', '.', '.', '.'], 
      ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'], ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']  
    ];
    state.turn = "WHITE"; state.phase = "SELECT_PIECE"; state.cursorRow = 6; state.cursorCol = 0;
    state.originRow = -1; state.originCol = -1; state.statusMessage = "PICK PIECE";
    state.checkPlayer = ""; state.winner = ""; state.promoRow = -1; state.promoCol = -1;
    state.wKingR = 7; state.wKingC = 4; state.bKingR = 0; state.bKingC = 4;
    state.wKingMoved = false; state.wRookAMoved = false; state.wRookHMoved = false;
    state.bKingMoved = false; state.bRookAMoved = false; state.bRookHMoved = false;
    state.epTargetCol = -1;
    state.loneKingMoves = 0;
    state.drawReason = "";
    clearValidMovesCache();
  }

  function isKingInCheck(playerColor) {
    let kr = (playerColor === "WHITE") ? state.wKingR : state.bKingR;
    let kc = (playerColor === "WHITE") ? state.wKingC : state.bKingC;
    if (kr === -1 || kc === -1) return false;
    const enemy = (playerColor === "WHITE") ? "BLACK" : "WHITE";
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] !== '.' && isPlayerPiece(board[r][c], enemy)) {
          if (isValidMove(r, c, kr, kc, board[r][c], true)) return true;
        }
      }
    }
    return false;
  }

  function hasLegalMoves(playerColor) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        let p = board[r][c];
        if (p === '.' || !isPlayerPiece(p, playerColor)) continue;
        for (let tr = 0; tr < 8; tr++) {
          for (let tc = 0; tc < 8; tc++) {
            if (isValidMove(r, c, tr, tc, p, false)) return true;
          }
        }
      }
    }
    return false; 
  }

  function countPieces(playerColor) {
    let count = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] !== '.' && isPlayerPiece(board[r][c], playerColor)) {
          count++;
        }
      }
    }
    return count;
  }

  function isValidMove(or, oc, tr, tc, piece, skipKingCheck) {
    const pieceTurn = (piece === piece.toUpperCase()) ? "WHITE" : "BLACK";
    if (isPlayerPiece(board[tr][tc], pieceTurn)) return false;

    const rDiff = tr - or, cDiff = tc - oc;
    const absR = Math.abs(rDiff), absC = Math.abs(cDiff);
    const target = board[tr][tc];
    const type = piece.toUpperCase();

    let geoValid = false;

    if (type === 'P') {
      const dir = (pieceTurn === "WHITE") ? -1 : 1;
      if (cDiff === 0 && rDiff === dir && target === '.') geoValid = true;
      else if (cDiff === 0 && or === ((pieceTurn === "WHITE") ? 6 : 1) && rDiff === (2 * dir) && board[or + dir][oc] === '.' && target === '.') geoValid = true;
      else if (absC === 1 && rDiff === dir && target !== '.') geoValid = true;
      else if (absC === 1 && rDiff === dir && target === '.' && state.epTargetCol === tc) {
        if (pieceTurn === "WHITE" && or === 3) geoValid = true;
        if (pieceTurn === "BLACK" && or === 4) geoValid = true;
      }
    }
    else if (type === 'N') {
      geoValid = (absR === 2 && absC === 1) || (absR === 1 && absC === 2);
    }
    else if (type === 'K') {
      if (absR <= 1 && absC <= 1) geoValid = true;
      
      if (!skipKingCheck && rDiff === 0 && absC === 2) {
        const kingMoved = (pieceTurn === "WHITE") ? state.wKingMoved : state.bKingMoved;
        if (!kingMoved && !isKingInCheck(pieceTurn)) {
          if (tc === 6) {
            const rookMoved = (pieceTurn === "WHITE") ? state.wRookHMoved : state.bRookHMoved;
            if (!rookMoved && board[or][5] === '.' && board[or][6] === '.') {
              board[or][5] = piece; board[or][oc] = '.';
              let safe = !isKingInCheck(pieceTurn);
              board[or][oc] = piece; board[or][5] = '.';
              if (safe) geoValid = true;
            }
          }
          else if (tc === 2) {
            const rookMoved = (pieceTurn === "WHITE") ? state.wRookAMoved : state.bRookAMoved;
            if (!rookMoved && board[or][1] === '.' && board[or][2] === '.' && board[or][3] === '.') {
              board[or][3] = piece; board[or][oc] = '.';
              let safe = !isKingInCheck(pieceTurn);
              board[or][oc] = piece; board[or][3] = '.';
              if (safe) geoValid = true;
            }
          }
        }
      }
    }
    else if (type === 'R' || type === 'B' || type === 'Q') {
      if (type === 'R' && rDiff !== 0 && cDiff !== 0) return false;
      if (type === 'B' && absR !== absC) return false;
      if (type === 'Q' && rDiff !== 0 && cDiff !== 0 && absR !== absC) return false;

      geoValid = true;
      let sR = rDiff === 0 ? 0 : (rDiff > 0 ? 1 : -1);
      let sC = cDiff === 0 ? 0 : (cDiff > 0 ? 1 : -1);
      let curR = or + sR, curC = oc + sC;
      while (curR !== tr || curC !== tc) {
        if (board[curR][curC] !== '.') { geoValid = false; break; }
        curR += sR; curC += sC;
      }
    }

    if (!geoValid) return false;

    if (!skipKingCheck) {
      let oldS = board[or][oc], oldT = board[tr][tc];
      let isEP = (type === 'P' && absC === 1 && oldT === '.');
      let epRow = (pieceTurn === "WHITE") ? 3 : 4;
      let oldEP = isEP ? board[epRow][tc] : '.';
      if (isEP) board[epRow][tc] = '.';

      board[tr][tc] = oldS; board[or][oc] = '.';
      let saveR = (type === 'K') ? ((pieceTurn === "WHITE") ? state.wKingR : state.bKingR) : -1;
      let saveC = (type === 'K') ? ((pieceTurn === "WHITE") ? state.wKingC : state.bKingC) : -1;
      if (type === 'K') {
        if (pieceTurn === "WHITE") { state.wKingR = tr; state.wKingC = tc; }
        else { state.bKingR = tr; state.bKingC = tc; }
      }
      let checkFlag = isKingInCheck(pieceTurn);
      
      board[or][oc] = oldS; board[tr][tc] = oldT;
      if (isEP) board[epRow][tc] = oldEP; 
      if (type === 'K') {
        if (pieceTurn === "WHITE") { state.wKingR = saveR; state.wKingC = saveC; }
        else { state.bKingR = saveR; state.bKingC = saveC; }
      }
      if (checkFlag) return false; 
    }
    return true;
  }

  function drawMenuButton(label, yPos, isSelected) {
    if (isSelected) {
      h.setColor(BASE_COLOR).fillRect(130, yPos, 350, yPos + 32);
      h.setColor(1); 
    } else {
      h.setColor(BASE_COLOR).drawRect(130, yPos, 350, yPos + 32);
    }
    h.drawString(label, 240, yPos + 16);
  }

  function resolvePostMoveEffects() {
    // 1. Process 15-Move Lone King Rule (evaluated for the player who JUST completed their turn)
    if (countPieces("WHITE") === 1 || countPieces("BLACK") === 1) {
      if (countPieces(state.turn) === 1) {
        state.loneKingMoves++;
      }
    } else {
      state.loneKingMoves = 0; // Reset if both players still have active army pieces
    }

    if (state.loneKingMoves >= 15) {
      state.winner = "DRAW";
      state.drawReason = "15_MOVE_RULE";
      state.phase = "GAME_OVER_SCREEN";
      clearValidMovesCache(); draw(); return;
    }

    // 2. Process Standard Checkmate / Stalemate Verification Loops
    let nextTurn = (state.turn === "WHITE") ? "BLACK" : "WHITE";
    let nextCheck = isKingInCheck(nextTurn);
    
    if (!hasLegalMoves(nextTurn)) {
      if (nextCheck) {
        state.winner = state.turn; // Checkmate achieved
      } else {
        state.winner = "DRAW";
        state.drawReason = "STALEMATE"; // Classic Stalemate detected
      }
      state.phase = "GAME_OVER_SCREEN";
    } else {
      state.turn = nextTurn; state.phase = "SELECT_PIECE";
      state.statusMessage = "PICK PIECE"; 
      state.checkPlayer = nextCheck ? nextTurn : ""; 
      if (nextCheck) playSound("ALARM");
    }
    clearValidMovesCache(); draw();
  }

  function draw() {
    h.clear(1);
    if (state.phase === "MAIN_MENU") {
      h.setColor(BASE_COLOR).setFontMonofonto28().setFontAlign(0, 0).drawString("PipChess", 240, 50);
      h.drawLine(80, 75, 400, 75); h.setFontMonofonto18();
      drawMenuButton("2 Player Mode", 130, state.menuSelection === 0);
      drawMenuButton("Single Player Mode", 180, state.menuSelection === 1);
      h.setFontMonofonto16().drawString("Rotate any dial to navigate. Click to select.", 240, 270);
      return;
    }
    if (state.phase === "COMING_SOON") {
      h.setColor(BASE_COLOR).setFontMonofonto18().setFontAlign(0, 0).drawString("This feature is coming soon", 240, 80);
      drawMenuButton("Ok", 160, true); return;
    }
    if (state.phase === "PROMOTION_MENU") {
      let displayColor = (state.turn === "WHITE") ? "White" : "Black";
      h.setColor(BASE_COLOR).setFontMonofonto18().setFontAlign(0, 0).drawString(displayColor + ", Choose Your Promotion", 240, 45);
      drawMenuButton("Queen", 85, state.menuSelection === 0);
      drawMenuButton("Bishop", 125, state.menuSelection === 1);
      drawMenuButton("Rook", 165, state.menuSelection === 2);
      drawMenuButton("Knight", 205, state.menuSelection === 3);
      return;
    }
    
    if (state.phase === "GAME_OVER_SCREEN") {
      h.setColor(BASE_COLOR).setFontMonofonto28().setFontAlign(0, 0).drawString("GAME OVER", 240, 45);
      h.setFontMonofonto16();
      
      let endMsg = "Draw Match.";
      if (state.winner === "WHITE") {
        endMsg = "Black has been Checkmated. White Wins!";
      } else if (state.winner === "BLACK") {
        endMsg = "White has been Checkmated. Black Wins!";
      } else if (state.winner === "DRAW") {
        if (state.drawReason === "STALEMATE") {
          endMsg = "Stalemate! No legal moves left.";
        } else if (state.drawReason === "15_MOVE_RULE") {
          endMsg = "Draw: 15-Move Lone King Rule met.";
        }
      }
      
      h.drawString(endMsg, 240, 90);
      drawMenuButton("Play Again", 160, true);
      h.setColor(BASE_COLOR).drawString('Press the "ITEMS" button on your Pip-Boy to exit PipChess', 240, 270);
      return;
    }

    h.setColor(BASE_COLOR).drawLine(0, 44, 480, 44).setFontMonofonto28().setFontAlign(0, 0).drawString("PipChess v1.7.0", 240, 25);
    if (state.phase === "SELECT_TARGET") {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (r === state.originRow && c === state.originCol) h.setColor(BASE_COLOR).fillRect(BOARD_X + (c * SQUARE_SIZE) + 1, BOARD_Y + (r * SQUARE_SIZE) + 1, BOARD_X + (c * SQUARE_SIZE) + SQUARE_SIZE - 1, BOARD_Y + (r * SQUARE_SIZE) + SQUARE_SIZE - 1);
          else if (state.validTargets[r][c]) h.setColor(HIGHLIGHT_COLOR).fillRect(BOARD_X + (c * SQUARE_SIZE) + 1, BOARD_Y + (r * SQUARE_SIZE) + 1, BOARD_X + (c * SQUARE_SIZE) + SQUARE_SIZE - 1, BOARD_Y + (r * SQUARE_SIZE) + SQUARE_SIZE - 1);
        }
      }
    }
    h.setColor(BASE_COLOR);
    for (let i = 0; i <= 8; i++) {
      h.drawLine(BOARD_X, BOARD_Y + (i * SQUARE_SIZE), BOARD_X + (8 * SQUARE_SIZE), BOARD_Y + (i * SQUARE_SIZE));
      h.drawLine(BOARD_X + (i * SQUARE_SIZE), BOARD_Y, BOARD_X + (i * SQUARE_SIZE), BOARD_Y + (8 * SQUARE_SIZE));
    }
    let tx = BOARD_X + (state.cursorCol * SQUARE_SIZE), ty = BOARD_Y + (state.cursorRow * SQUARE_SIZE);
    h.drawRect(tx + 1, ty + 1, tx + SQUARE_SIZE - 1, ty + SQUARE_SIZE - 1);

    h.setFontMonofonto18().setFontAlign(-1, -1).drawString("TURN: " + state.turn, 245, 60);
    h.drawString("STATUS: " + state.statusMessage, 245, 90);
    
    h.setFontMonofonto14();
    if (state.phase === "SELECT_PIECE") {
      h.drawString("Left Knob: Up/Down", 245, 120);
      h.drawString("Right Knob: L/R", 245, 140);
      h.drawString("Click: Select Piece", 245, 160);
    } else if (state.phase === "SELECT_TARGET") {
      h.drawString("Move cursor to target", 245, 120);
      h.drawString("Click target to move", 245, 140);
      h.drawString("Click origin to cancel", 245, 160);
    }

    h.setFontMonofonto14().setFontAlign(0, 0);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        let p = board[r][c];
        if (p !== '.') {
          let isWhite = (p === p.toUpperCase());
          h.setColor((state.phase === "SELECT_TARGET" && r === state.originRow && c === state.originCol) ? 1 : BASE_COLOR);
          let disp = isWhite ? p : "[" + p.toUpperCase() + "]";
          let yNudge = isWhite ? 16 : 14; 
          h.drawString(disp, BOARD_X + (c * SQUARE_SIZE) + 13, BOARD_Y + (r * SQUARE_SIZE) + yNudge);
        }
      }
    }
    
    if (state.checkPlayer !== "") {
      h.setColor(BASE_COLOR).setFontMonofonto16().setFontAlign(-1, -1);
      h.drawString(state.checkPlayer + " KING CHECK!", 245, 190);
    }
  }

  function handleSelectionClick() {
    if (state.phase === "MAIN_MENU") {
      playSound("SELECT");
      if (state.menuSelection === 0) resetGame(); else state.phase = "COMING_SOON";
      draw(); return;
    }
    if (state.phase === "COMING_SOON") {
      playSound("SELECT"); state.phase = "MAIN_MENU"; draw(); return;
    }
    if (state.phase === "PROMOTION_MENU") {
      playSound("SELECT");
      let pc = state.menuSelection === 0 ? 'Q' : (state.menuSelection === 1 ? 'B' : (state.menuSelection === 2 ? 'R' : 'N'));
      if (state.turn === "BLACK") pc = pc.toLowerCase();
      board[state.promoRow][state.promoCol] = pc; resolvePostMoveEffects(); return;
    }
    if (state.phase === "GAME_OVER_SCREEN") { playSound("SELECT"); resetGame(); draw(); return; }
    if (state.phase === "SELECT_PIECE") {
      if (isPlayerPiece(board[state.cursorRow][state.cursorCol], state.turn)) {
        playSound("SELECT"); state.originRow = state.cursorRow; state.originCol = state.cursorCol;
        state.phase = "SELECT_TARGET"; state.statusMessage = "DESTINATION";
        calculateValidMovesCache(state.originRow, state.originCol, board[state.originRow][state.originCol]);
        draw();
      } else playSound("CANCELED");
    } else if (state.phase === "SELECT_TARGET") {
      if (state.cursorRow === state.originRow && state.cursorCol === state.originCol) {
        playSound("SELECT"); state.phase = "SELECT_PIECE"; state.statusMessage = "PICK PIECE";
        clearValidMovesCache(); draw(); return;
      }
      if (state.validTargets[state.cursorRow][state.cursorCol]) {
        playSound("SELECT"); 
        let p = board[state.originRow][state.originCol];
        let nextEpTarget = -1; 

        if (p.toUpperCase() === 'P' && state.cursorCol === state.epTargetCol && state.cursorCol !== state.originCol && board[state.cursorRow][state.cursorCol] === '.') {
          let captureRow = (state.turn === "WHITE") ? 3 : 4;
          board[captureRow][state.cursorCol] = '.';
        }

        if (p.toUpperCase() === 'K' && Math.abs(state.cursorCol - state.originCol) === 2) {
          if (state.cursorCol === 6) { 
            board[state.cursorRow][5] = board[state.cursorRow][7];
            board[state.cursorRow][7] = '.';
          } else if (state.cursorCol === 2) { 
            board[state.cursorRow][3] = board[state.cursorRow][0];
            board[state.cursorRow][0] = '.';
          }
        }

        if (p.toUpperCase() === 'P' && Math.abs(state.cursorRow - state.originRow) === 2) {
          nextEpTarget = state.cursorCol;
        }

        if (p === 'K') state.wKingMoved = true;
        if (p === 'k') state.bKingMoved = true;
        if (p === 'R' && state.originRow === 7 && state.originCol === 0) state.wRookAMoved = true;
        if (p === 'R' && state.originRow === 7 && state.originCol === 7) state.wRookHMoved = true;
        if (p === 'r' && state.originRow === 0 && state.originCol === 0) state.bRookAMoved = true;
        if (p === 'r' && state.originRow === 0 && state.originCol === 7) state.bRookHMoved = true;

        board[state.originRow][state.originCol] = '.'; 
        board[state.cursorRow][state.cursorCol] = p;
        state.epTargetCol = nextEpTarget; 

        if (p === 'K') { state.wKingR = state.cursorRow; state.wKingC = state.cursorCol; }
        if (p === 'k') { state.bKingR = state.cursorRow; state.bKingC = state.cursorCol; }
        
        if (p.toUpperCase() === 'P' && (state.cursorRow === 0 || state.cursorRow === 7)) {
          state.promoRow = state.cursorRow; state.promoCol = state.cursorCol;
          state.phase = "PROMOTION_MENU"; state.menuSelection = 0;
          clearValidMovesCache(); draw(); return;
        }
        resolvePostMoveEffects();
      } else { state.statusMessage = "INVALID MOVE"; playSound("CANCELED"); draw(); }
    }
  }

  function handleMenuScroll(dir, max) {
    state.menuSelection = (dir > 0) ? (state.menuSelection + 1) % max : (state.menuSelection - 1 + max) % max;
    draw();
  }

  function onWheel(knob, dir) {
    if (dir === 0) { handleSelectionClick(); return; }
    playSound("SCROLL");
    if (state.phase === "MAIN_MENU") { handleMenuScroll(dir, 2); return; }
    if (state.phase === "PROMOTION_MENU") { handleMenuScroll(dir, 4); return; }
    if (state.phase === "COMING_SOON" || state.phase === "GAME_OVER_SCREEN") return;
    if (knob === 1) state.cursorRow = (dir > 0) ? (state.cursorRow + 1) % 8 : (state.cursorRow - 1 + 8) % 8;
    else state.cursorCol = (dir > 0) ? (state.cursorCol + 1) % 8 : (state.cursorCol - 1 + 8) % 8;
    draw();
  }

  if (Pip.audioStop) Pip.audioStop();
  clearValidMovesCache();
  Pip.onExclusive("knob1", function(d) { onWheel(1, d); });
  Pip.onExclusive("knob2", function(d) { onWheel(2, d); });
  draw();

  instance = {
    id: "PIPCHESS", notDefault: true, fullscreen: true,
    remove: function () {
      if (removed) return; removed = true;
      Pip.removeListener("knob1"); Pip.removeListener("knob2");
      if (Pip.audioStop) Pip.audioStop();
      h.clear(); 
    }
  };
  return instance;
});
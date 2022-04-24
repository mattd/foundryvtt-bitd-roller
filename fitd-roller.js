class FitDRoller {
  /**
  * Gets Foundry major and minor versions.
  * @return {{major: number, minor: number}} version object
  */
  getFoundryVersion () {
    let versionParts;

    if (game.version) {
      versionParts = game.version.split('.');
      return {
        major: parseInt(versionParts[0]),
        minor: parseInt(versionParts[1])
      };
    }

    versionParts = game.data.version.split('.');
    return {
      major: parseInt(versionParts[1]),
      minor: parseInt(versionParts[2])
    };
  }

  /**
  * Creates and shows the roller popup.
  * @return none
  */
  async showRoller() {
    const maxDice = game.settings.get("fitd-roller", "maxDiceCount");
    const defaultDiceCount = game.settings.get(
      "fitd-roller", "defaultDiceCount"
    );
    const actions = game.settings.get("fitd-roller", "actions");
    const defaultPosition = game.settings.get(
      "fitd-roller", "defaultPosition"
    );
    const defaultEffect = game.settings.get("fitd-roller", "defaultEffect");

    new Dialog({
      title: `${game.i18n.localize('FitDRoller.RollTitle')}`,
      content: `
        <h2>${game.i18n.localize('FitDRoller.Roll')}</h2>
        <form>
          <div class="form-group">
            <label>
              ${game.i18n.localize('FitDRoller.RollNumberOfDice')}:
            </label>
            <select id="dice" name="dice">
              ${
                Array(maxDice + 1).fill().map((item, i) => {
                  return `<option value="${i}">${i}d</option>`
                }).join('')
              }
            </select>
            <script>
              $('#dice option[value="${defaultDiceCount}"]').prop(
                "selected", "selected"
              );
            </script>
          </div>
          <div class="form-group">
            <label>${game.i18n.localize('FitDRoller.Action')}:</label>
            <select id="action" name="action">
              <option value=""></option>
              ${
                actions.split(',').map(item => {
                  return `<option value="${item}">${item}</option>`
                })
              }
            </select>
          </div>
          <div class="form-group">
            <label>${game.i18n.localize('FitDRoller.Position')}:</label>
            <select id="pos" name="pos">
              <option value="controlled">
                ${game.i18n.localize('FitDRoller.PositionControlled')}
              </option>
              <option value="risky">
                ${game.i18n.localize('FitDRoller.PositionRisky')}
              </option>
              <option value="desperate">
                ${game.i18n.localize('FitDRoller.PositionDesperate')}
              </option>
            </select>
            <script>$('#pos option[value="${defaultPosition}"]').prop(
                "selected", "selected"
              );
            </script>
          </div>
          <div class="form-group">
            <label>${game.i18n.localize('FitDRoller.Effect')}:</label>
            <select id="fx" name="fx">
              <option value="limited">
                ${game.i18n.localize('FitDRoller.EffectLimited')}
              </option>
              <option value="standard">
                ${game.i18n.localize('FitDRoller.EffectStandard')}
              </option>
              <option value="great">
                ${game.i18n.localize('FitDRoller.EffectGreat')}
              </option>
            </select>
            <script>
              $('#fx option[value="${defaultEffect}"]').prop(
                "selected", "selected"
              );
            </script>
          </div>
        </form>
      `,
      buttons: {
        yes: {
          icon: "<i class='fas fa-check'></i>",
          label: game.i18n.localize('FitDRoller.Roll'),
          callback: async (html) => {
            const diceAmount = parseInt(html.find('[name="dice"]')[0].value);
            const action = html.find('[name="action"]')[0].value;
            const position = html.find('[name="pos"]')[0].value;
            const effect = html.find('[name="fx"]')[0].value;
            await this.roll(action, diceAmount, position, effect);
          }
        },
        no: {
          icon: "<i class='fas fa-times'></i>",
          label: game.i18n.localize('FitDRoller.Close'),
        },
      },
      default: "yes",
    }).render(true);
  }

  /**
   * Rolls the Dice.
   * @param {string} attribute arbitrary label for the roll
   * @param {int} diceAmount number of dice to roll
   * @param {string} position position
   * @param {string} effect effect
   */
  async roll(
    attribute = "",
    diceAmount = 0,
    position = "risky",
    effect = "standard"
  ) {
    let zeroMode = false;
    if (diceAmount < 0) { diceAmount = 0; }
    if (diceAmount === 0) { zeroMode = true; diceAmount = 2; }

    const r = new Roll(`${diceAmount}d6`, {});

    if (this.getFoundryVersion().major > 7) {
      await r.evaluate({async: true});
    } else {
      r.roll();
    }
    return await this.showChatRollMessage(
      r, zeroMode, attribute, position, effect
    );
  }

  /**
   * Shows Chat message for a roll.
   *
   * @param {Roll} r array of rolls
   * @param {Boolean} zeroMode whether to treat as if 0d
   * @param {string} attribute arbitrary label for the roll
   * @param {string} position position
   * @param {string} effect effect
   */
  async showChatRollMessage(
    r,
    zeroMode,
    attribute = "",
    position = "",
    effect = ""
  ) {
    const speaker = ChatMessage.getSpeaker();
    let rolls = [];

    rolls = (r.terms)[0].results;

    // Retrieve Roll outcome.
    let rollOutcome = "";

    rollOutcome = this.getRollOutcome(rolls, zeroMode);
    let color = game.settings.get("fitd-roller", "backgroundColor");

    let positionLocalize = '';
    switch (position)
    {
      case 'controlled':
        positionLocalize = 'FitDRoller.PositionControlled';
        break;
      case 'desperate':
        positionLocalize = 'FitDRoller.PositionDesperate';
        break;
      case 'risky':
      default:
        positionLocalize = 'FitDRoller.PositionRisky';
    }

    let effectLocalize = '';
    switch (effect)
    {
      case 'limited':
        effectLocalize = 'FitDRoller.EffectLimited';
        break;
      case 'great':
        effectLocalize = 'FitDRoller.EffectGreat';
        break;
      case 'standard':
      default:
        effectLocalize = 'FitDRoller.EffectStandard';
    }

    const renderedTemplate = await renderTemplate(
      "modules/fitd-roller/templates/fitd-roll.html",
      {
        rolls,
        rollOutcome,
        attribute,
        position,
        positionLocalize,
        effect,
        effectLocalize,
        zeroMode,
        color
      }
    );

    const message = {
      speaker,
      content: renderedTemplate,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: r
    };

    if (this.getFoundryVersion().major > 7) {
      return CONFIG.ChatMessage.documentClass.create(message, {});
    } else {
      return CONFIG.ChatMessage.entityClass.create(message, {});
    }
  }

  /**
   *  Gets outcome of the Roll.
   *  - failure
   *  - partial-success
   *  - success
   *  - critical-success
   * @param {Array} rolls results of dice rolls
   * @param {Boolean} zeroMode whether to treat as if 0d
   * @returns {string} success/failure outcome of roll
   */
  getRollOutcome(rolls, zeroMode = false) {
    let sortedRolls = [];
    // Sort roll values from lowest to highest.
    sortedRolls = rolls.map((i) => i.result).sort();

    let rollOutcome = "failure";

    if (sortedRolls[0] === 6 && zeroMode) {
      rollOutcome = "critical-success";
    } else {
      let useDie;
      let prevUseDie = false;

      if (zeroMode) {
        useDie = sortedRolls[0];
      } else {
        useDie = sortedRolls[sortedRolls.length - 1];

        if (sortedRolls.length - 2 >= 0) {
          prevUseDie = sortedRolls[sortedRolls.length - 2];
        }
      }

      if (useDie <= 3) {
         // 1,2,3 = failure
        rollOutcome = "failure";
      } else if (useDie === 6) {
        if (prevUseDie && prevUseDie === 6) {
          // 6,6 - critical success
          rollOutcome = "critical-success";
        } else {
          // 6 - success
          rollOutcome = "success";
        }
      } else {
        // else (4,5) = partial success
        rollOutcome = "partial-success";
      }
    }
    return rollOutcome;
  }
}

Hooks.once("ready", () => {
  game.fitdRoller = new FitDRoller();
});

Hooks.on("renderSceneControls", (app, html) => {
  const diceRoller = $(`
    <li class="scene-control" title="FitD Roller">
      <i class="fas fa-dice"></i>
    </li>
  `);]1
  diceRoller.on("click", async function () {
    await game.fitdRoller.showRoller();
  });
  if (isNewerVersion(game.version, '9.220')) {
    html.children().first().append(diceRoller);
  } else {
    html.append(diceRoller);
  }
});

Hooks.once("setup", () => {
  const defaultActions = [
    'Hunt',
    'Study',
    'Survey',
    'Tinker',
    'Finesse',
    'Prowl',
    'Skirmish',
    'Wreck',
    'Attune',
    'Command',
    'Consort',
    'Sway'
  ];

  game.settings.register("fitd-roller", "backgroundColor", {
    "name": game.i18n.localize("FitDRoller.backgroundColorName"),
    "hint": game.i18n.localize("FitDRoller.backgroundColorHint"),
    "scope": "world",
    "config": true,
    "choices": {
      "gray": game.i18n.localize("FitDRoller.backgroundColorGray"),
      "black": game.i18n.localize("FitDRoller.backgroundColorBlack")
    },
    "default": "gray",
    "type": String
  });

  game.settings.register("fitd-roller", "maxDiceCount", {
    "name": game.i18n.localize("FitDRoller.maxDiceCountName"),
    "hint": game.i18n.localize("FitDRoller.maxDiceCountHint"),
    "scope": "world",
    "config": true,
    "default": 10,
    "type": Number
  });

  game.settings.register("fitd-roller", "defaultDiceCount", {
    "name": game.i18n.localize("FitDRoller.defaultDiceCountName"),
    "hint": game.i18n.localize("FitDRoller.defaultDiceCountHint"),
    "scope": "world",
    "config": true,
    "default": 2,
    "type": Number
  });

  game.settings.register("fitd-roller", "actions", {
    "name": game.i18n.localize("FitDRoller.actionsName"),
    "hint": game.i18n.localize("FitDRoller.actionsHint"),
    "scope": "world",
    "config": true,
    "type": String,
    "default": defaultActions.map(item => {
      return game.i18n.localize(`FitDRoller.DefaultAction${item}`)
    }).join(',')
  });

  game.settings.register("fitd-roller", "defaultPosition", {
    "name": game.i18n.localize("FitDRoller.defaultPositionName"),
    "hint": game.i18n.localize("FitDRoller.defaultPositionHint"),
    "scope": "world",
    "config": true,
    "type": String,
    "choices": {
      "controlled": game.i18n.localize("FitDRoller.PositionControlled"),
      "risky": game.i18n.localize("FitDRoller.PositionRisky"),
      "desperate": game.i18n.localize("FitDRoller.PositionDesperate")
    },
    "default": "risky"
  });

  game.settings.register("fitd-roller", "defaultEffect", {
    "name": game.i18n.localize("FitDRoller.defaultEffectName"),
    "hint": game.i18n.localize("FitDRoller.defaultEffectHint"),
    "scope": "world",
    "config": true,
    "type": String,
    "choices": {
      "great": game.i18n.localize("FitDRoller.EffectGreat"),
      "standard": game.i18n.localize("FitDRoller.EffectStandard"),
      "limited": game.i18n.localize("FitDRoller.EffectLimited")
    },
    "default": "standard"
  });
});

console.log("FitDRoller | Blades in the Dark Dice Roller loaded");

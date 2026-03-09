Hooks.on("renderActorDirectory", (app, html, data) => {
  // 액터(캐릭터) 탭 상단에 버튼 추가
  const importButton = $(`<button class="ccfolia-import-btn" style="margin-bottom: 5px;"><i class="fas fa-file-import"></i> 코코포리아 임포트</button>`);
  html.find(".directory-header .action-buttons").append(importButton);

  importButton.click(ev => {
    new Dialog({
      title: "CoC7 캐릭터 자동 임포터",
      content: "<p>특성치가 포함된 코코포리아 api 데이터를 붙여넣어주세요.</p><textarea id='ccfolia-data' style='width:100%; height:250px; font-family:monospace;'></textarea>",
      buttons: {
        import: {
          label: "캐릭터 생성!",
          callback: async (html) => {
            const rawData = html.find("#ccfolia-data").val().trim();
            if (!rawData) return ui.notifications.warn("데이터가 비어있습니다.");

            try {
              const parsed = JSON.parse(rawData);
              if (parsed.kind !== "character" || !parsed.data) {
                return ui.notifications.error("유효한 코코포리아 데이터가 아닙니다.");
              }

              const data = parsed.data;
              const name = data.name || "이름 없는 탐사자";
              const memo = data.memo ? data.memo.replace(/\n/g, "<br>") : ""; 
              
              // --- 메모에서 정보 추출 ---
              const memoRaw = data.memo || "";
              const getMemoField = (fieldName) => {
                const match = memoRaw.match(new RegExp(`${fieldName}\\s*:\\s*([^\\n\\r]+)`));
                return match ? match[1].trim() : "";
              };

              const occupation = getMemoField("직업");
              const age = getMemoField("나이");
              const sex = getMemoField("성별");
              const residence = getMemoField("거주지");
              const birthplace = getMemoField("출생지");

              const getStatus = (label) => data.status?.find(s => s.label === label) || {value: 0, max: 0};
              const hp = getStatus("HP");
              const mp = getStatus("MP");
              const san = getStatus("SAN");
              
              const movParam = data.params?.find(p => p.label === "이동력");
              const mov = movParam ? parseInt(movParam.value) : 8;

              let chars = { str: 0, con: 0, siz: 0, dex: 0, app: 0, int: 0, pow: 0, edu: 0 };
              let luckValue = getStatus("행운").value || 0;
              const skillsList = [];

              if (data.commands) {
                const commandLines = data.commands.split("\n");
                const regex = /CC<=(\d+)\s+(.+)/; 

                for (let line of commandLines) {
                  const match = line.match(regex);
                  if (match) {
                    const value = parseInt(match[1]) || 0;
                    const itemName = match[2].trim();

                    if (itemName === "근력") chars.str = value;
                    else if (itemName === "건강") chars.con = value;
                    else if (itemName === "크기") chars.siz = value;
                    else if (itemName === "민첩") chars.dex = value;
                    else if (itemName === "외모") chars.app = value;
                    else if (itemName === "지능") chars.int = value;
                    else if (itemName === "정신력") chars.pow = value;
                    else if (itemName === "교육") chars.edu = value;
                    else if (itemName === "행운") luckValue = value; 
                    else skillsList.push({ name: itemName, value: value });
                  }
                }
              }

              // 액터 생성
              let actor = await Actor.create({
                name: name,
                type: "character",
                system: {
                  infos: {
                    occupation: occupation,
                    age: age,
                    sex: sex,
                    residence: residence,
                    birthplace: birthplace
                  },
                  characteristics: {
                    str: { value: chars.str }, con: { value: chars.con }, siz: { value: chars.siz },
                    dex: { value: chars.dex }, app: { value: chars.app }, int: { value: chars.int },
                    pow: { value: chars.pow }, edu: { value: chars.edu }
                  },
                  attribs: {
                    hp: { value: hp.value, max: hp.max }, mp: { value: mp.value, max: mp.max },
                    san: { value: san.value, max: san.max }, lck: { value: luckValue, max: 99 },
                    mov: { value: mov }
                  },
                  backstory: memo
                }
              });

              const getIconPath = (skillName) => {
                const n = skillName.replace(/\s/g, "");
                const map = {
                  "관찰력": "spot_hidden.svg", "듣기": "listen.svg", "자료조사": "library_use.svg",
                  "회피": "dodge.svg", "은밀행동": "stealth.svg", "매혹": "charm.svg",
                  "설득": "persuade.svg", "말재주": "fast_talk.svg", "위협": "intimidate.svg",
                  "심리학": "psychology.svg", "정신분석": "psychoanalysis.svg", "응급처치": "first_aid.svg",
                  "의료": "medicine.svg", "오컬트": "occult.svg", "크툴루신화": "cthulhu_mythos.svg",
                  "기계수리": "mechanical_repair.svg", "전기수리": "electrical_repair.svg",
                  "열쇠공": "locksmith.svg", "중장비조작": "operate_heavy_machinery.svg",
                  "역사": "history.svg", "고고학": "archaeology.svg", "인류학": "anthropology.svg",
                  "자연": "natural_world.svg", "항법": "navigate.svg", "회계": "accounting.svg",
                  "법률": "law.svg", "추적": "track.svg", "수영": "swim.svg", "도약": "jump.svg",
                  "오르기": "climb.svg", "변장": "disguise.svg", "감정": "appraise.svg",
                  "승마": "ride.svg", "손놀림": "sleight_of_hand.svg", "재력": "credit_rating.svg",
                  "자동차운전": "drive_auto.svg", "동물다루기": "animal_handling.svg", 
                  "독순술": "lip_reading.svg", "잠수": "diving.svg", "최면술": "hypnosis.svg", 
                  "포격": "artillery.svg", "폭파": "demolitions.svg"
                };

                for (let key in map) {
                  if (n.includes(key)) return "systems/CoC7/assets/icons/skills/" + map[key];
                }

                if (n.includes("과학")) {
                  if (n.includes("수사")) return "systems/CoC7/assets/icons/skills/science_forensics.svg";
                  if (n.includes("식물")) return "systems/CoC7/assets/icons/skills/science_botany.svg";
                  if (n.includes("동물")) return "systems/CoC7/assets/icons/skills/science_zoology.svg";
                  if (n.includes("화학")) return "systems/CoC7/assets/icons/skills/science_chemistry.svg";
                  if (n.includes("암호")) return "systems/CoC7/assets/icons/skills/science_cryptography.svg";
                  if (n.includes("수학")) return "systems/CoC7/assets/icons/skills/science_mathematics.svg";
                  if (n.includes("지질")) return "systems/CoC7/assets/icons/skills/science_geology.svg";
                  if (n.includes("천문")) return "systems/CoC7/assets/icons/skills/science_astronomy.svg";
                  if (n.includes("약학")) return "systems/CoC7/assets/icons/skills/science_pharmacy.svg";
                  if (n.includes("생물")) return "systems/CoC7/assets/icons/skills/science_biology.svg";
                  if (n.includes("물리")) return "systems/CoC7/assets/icons/skills/science_physics.svg";
                  if (n.includes("기상")) return "systems/CoC7/assets/icons/skills/science_meteorology.svg";
                  return "systems/CoC7/assets/icons/skills/science_any.svg";
                }

                if (n.includes("사격")) {
                  if (n.includes("권총")) return "systems/CoC7/assets/icons/skills/firearms_handgun.svg";
                  if (n.includes("라이플") || n.includes("산탄총")) return "systems/CoC7/assets/icons/skills/firearms_rifle_shotgun.svg";
                  if (n.includes("기관단총") || n.includes("기관총")) return "systems/CoC7/assets/icons/skills/firearms_submachine_gun.svg";
                  if (n.includes("중화기")) return "systems/CoC7/assets/icons/skills/firearms_heavy_weapons.svg";
                  if (n.includes("화염방사기")) return "systems/CoC7/assets/icons/skills/firearms_flamethrower.svg";
                  if (n.includes("활")) return "systems/CoC7/assets/icons/skills/firearms_bow.svg";
                  return "systems/CoC7/assets/icons/skills/firearms_handgun.svg";
                }

                if (n.includes("언어")) return "systems/CoC7/assets/icons/skills/language.svg";
                if (n.includes("예술") || n.includes("공예")) {
                  if (n.includes("연기")) return "systems/CoC7/assets/icons/skills/art_craft_acting.svg";
                  return "systems/CoC7/assets/icons/skills/art_craft_any.svg";
                }
                if (n.includes("조종")) return "systems/CoC7/assets/icons/skills/pilot_any.svg";
                if (n.includes("생존술")) return "systems/CoC7/assets/icons/skills/survival_any.svg";

                if (n.includes("근접전")) {
                  if (n.includes("가롯테")) return "systems/CoC7/assets/icons/skills/fighting_garrote.svg";
                  if (n.includes("도검")) return "systems/CoC7/assets/icons/skills/fighting_sword.svg";
                  if (n.includes("도끼")) return "systems/CoC7/assets/icons/skills/fighting_axe.svg";
                  if (n.includes("도리깨")) return "systems/CoC7/assets/icons/skills/fighting_flail.svg";
                  if (n.includes("동력톱")) return "systems/CoC7/assets/icons/skills/fighting_chainsaw.svg";
                  if (n.includes("창")) return "systems/CoC7/assets/icons/skills/fighting_spear.svg";
                  if (n.includes("채찍")) return "systems/CoC7/assets/icons/skills/fighting_whip.svg";
                  if (n.includes("투척")) return "systems/CoC7/assets/icons/skills/fighting_throw.svg";
                  return "systems/CoC7/assets/icons/skills/fighting_brawl.svg";
                }
                
                return "icons/svg/item-bag.svg"; 
              };

              const skillsToCreate = [];
              const skillsToUpdate = [];

              for (let s of skillsList) {
                const normalizedName = s.name.replace(/\s/g, "");
                let existingItem = actor.items.find(i => i.name.replace(/\s/g, "") === normalizedName && i.type === "skill");

                if (existingItem) {
                  skillsToUpdate.push({ 
                    _id: existingItem.id, 
                    "system.value": s.value,
                    "system.base": s.value
                  });
                } else {
                  skillsToCreate.push({
                    name: s.name,
                    type: "skill",
                    img: getIconPath(s.name),
                    system: { 
                      value: s.value,
                      base: s.value
                    }
                  });
                }
              }

              if (skillsToUpdate.length > 0) await actor.updateEmbeddedDocuments("Item", skillsToUpdate);
              if (skillsToCreate.length > 0) await actor.createEmbeddedDocuments("Item", skillsToCreate);

              ui.notifications.info(name + " 캐릭터 완성!");

            } catch (err) {
              console.error(err);
              ui.notifications.error("데이터 파싱 오류! F12를 눌러 콘솔창을 확인해주세요.");
            }
          }
        }
      },
      default: "import"
    }).render(true);
  });
});
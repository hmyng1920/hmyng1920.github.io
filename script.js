document.addEventListener('DOMContentLoaded', () => {

  // --- Intersection Observer for scroll animations ---
  const animatedSections = document.querySelectorAll('.content-section, .features-section, .demo-section, .cta-final-section, .why-aura-section');
  const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
          if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              sectionObserver.unobserve(entry.target);
          }
      });
  }, { threshold: 0.1 });

  animatedSections.forEach(section => {
      sectionObserver.observe(section);
  });

  // --- IEQ Dashboard Demo Logic ---
  // 34-hour labels in 12-hour format (AM/PM)
const hourlyTimeLabels = [
  '12AM', // 0
  '1AM',  // 1
  '2AM',  // 2
  '3AM',  // 3
  '4AM',  // 4
  '5AM',  // 5
  '6AM',  // 6
  '7AM',  // 7
  '8AM',  // 8
  '9AM',  // 9
  '10AM', // 10
  '11AM', // 11
  '12PM', // 12
  '1PM',  // 13
  '2PM',  // 14
  '3PM',  // 15
  '4PM',  // 16
  '5PM',  // 17
  '6PM',  // 18
  '7PM',  // 19
  '8PM',  // 20
  '9PM',  // 21
  '10PM', // 22
  '11PM', // 23
];

  const dailyDateLabels = Array.from({ length: 10 }, (_, i) => { 
      const date = new Date(2025, 5, 1 + i); 
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const idealIEQValues = {
      co2Data: { min: 0, max: 800, label: 'Ideal CO₂ Range' },
      temperatureData: { min: 21, max: 24, label: 'Ideal Temp. Range' },
      humidityData: { min: 40, max: 60, label: 'Ideal Humidity Range' },
      lightData: { min: 300, max: 500, label: 'Ideal Light Range' },
      noiseData: { min: 0, max: 55, label: 'Ideal Noise Range' } 
  };

  function getColorFromPercentage(percent) {
    const clamped = Math.max(0, Math.min(percent, 30)) / 30;
  
    const white = { r: 255, g: 255, b: 255 };    // White
    const green = { r: 151, g: 222, b: 167 }; // #89cc98
  
    const r = Math.round(white.r + (green.r - white.r) * clamped);
    const g = Math.round(white.g + (green.g - white.g) * clamped);
    const b = Math.round(white.b + (green.b - white.b) * clamped);
  
    return `rgb(${r}, ${g}, ${b})`;
  }

  function getSBSColorFromPercentage(percent) {
    const clamped = Math.max(0, Math.min(percent, 30)) / 30;
  
    const white = { r: 255, g: 255, b: 255 };    // White
    const green = { r: 242, g: 217, b: 114 };      // #ffcc00
  
    const r = Math.round(white.r + (green.r - white.r) * clamped);
    const g = Math.round(white.g + (green.g - white.g) * clamped);
    const b = Math.round(white.b + (green.b - white.b) * clamped);
  
    return `rgb(${r}, ${g}, ${b})`;
  }

  let zoneData = {}; 
  let currentZoneId = null; 
  let currentDateIndex = 4;
  let currentLeftYAxisKey = 'co2Data';
  let currentRightYAxisKey = 'productivityData';
  let currentFloorplanMetric = 'productivity';

  const dashboardPanelMain = document.getElementById('dashboard-panel');
  const floorplanArea = document.querySelector('.floorplan-area');
  const zoneTitlePanelEl = document.getElementById('dashboardPanelTitle');
  const productivityGainEl = document.getElementById('productivity-gain');
  const savedHoursEl = document.getElementById('saved-hours');
  const absenteeismEl = document.getElementById('absenteeism');
  const sbsRiskEl = document.getElementById('sbs-risk');
  const riskLevelEl = document.querySelector('.risk-level');
  const timeSeriesChartDiv = document.getElementById('time-series-chart');
  const sbsPieChartDiv = document.getElementById('sbs-pie-chart');
  const dateSlider = document.getElementById('dateSlider');
  const sliderStartDateLabel = document.getElementById('slider-start-date-label');
  const sliderMidDateLabel = document.getElementById('slider-mid-date-label');
  const sliderEndDateLabel = document.getElementById('slider-end-date-label');
  const svgZones = document.querySelectorAll('#floorplan .zone');
  const zoneSelectorMobile = document.getElementById('zoneSelectorMobile');
  const leftYAxisSelect = document.getElementById('leftYAxisSelect');
  const rightYAxisSelect = document.getElementById('rightYAxisSelect');
  const timeSeriesChartTitleEl = document.getElementById('time-series-chart-title');
  const floorplanMetricToggles = document.querySelectorAll('input[name="floorplanMetric"]');
  const dateSliderLabel = document.getElementById('date-slider-label')

  const plotlyLayoutDefaults = {
      margin: { t: 5, b: 30, l: 40, r: 40, pad: 0 }, paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)', 
      font: { family: 'Helvetica, sans-serif', color: '#6e6e73', size: 12 },
      xaxis: { gridcolor: 'rgba(0,0,0,0.07)', tickfont: {size: 9} },
      yaxis: { gridcolor: 'rgba(0,0,0,0.07)', tickfont: {size: 9}, automargin: true },
      yaxis2: { gridcolor: 'rgba(0,0,0,0.07)', tickfont: {size: 9}, automargin: true },
      legend: { orientation: 'h', y: 1.15, yanchor: 'bottom', x: 0.5, xanchor: 'center', font: {size: 9} }
  };
  const plotlyConfig = { responsive: true, displayModeBar: false };

  function getAxisLabel(key) {
      const labels = { co2Data: 'CO₂ (ppm)', temperatureData: 'Temp (°C)', humidityData: 'Humidity (%)', lightData: 'Light (lux)', noiseData: 'Noise (dB)', productivityData: 'Prod. Index', sbsRiskTimeSeriesData: 'SBS Risk (%)' };
      return labels[key] || '';
  }
  
  function unpack(rows, key) {
      return rows.map(row => row[key]);
  }

  async function loadAndProcessCSV() {
      try {
          const response = await fetch('Floor 0 - Simulated data 2.csv');
          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}, trying to fetch ${response.url}`);
          }
          const csvText = await response.text();
          const parseResult = Papa.parse(csvText, { header: true, dynamicTyping: true, skipEmptyLines: true });
          
          if (parseResult.errors.length > 0) {
              console.warn("CSV Parsing Errors:", parseResult.errors);
          }
          const rows = parseResult.data;

          if (!rows || rows.length === 0) {
              throw new Error("CSV data is empty or not parsed correctly.");
          }
          
          const getUniqueValues = (data, key) => [...new Set(data.map(item => item[key]))];
          const uniqueZoneIds = getUniqueValues(rows, 'zone_id').filter(id => id != null && id !== "" && !isNaN(id));


          const processedZoneData = {};

          uniqueZoneIds.forEach(zoneIdStr => {
              const zoneId = zoneIdStr.toString(); // Ensure it's a string for key consistency
              const zoneRows = rows.filter(row => row.zone_id?.toString() === zoneId);
              if (zoneRows.length === 0) return;

              const staticAbsenteeism = zoneRows[0].absenteeism != null ? parseFloat(zoneRows[0].absenteeism.toFixed(1)) : 0;
              
              const sbsCauses = {
                  'CO₂': parseFloat((unpack(zoneRows, 'co2_risk').reduce((a, b) => a + (b || 0), 0) / zoneRows.length * 100).toFixed(1)) || 0,
                  'Temp': parseFloat((unpack(zoneRows, 'ta_risk').reduce((a, b) => a + (b || 0), 0) / zoneRows.length * 100).toFixed(1)) || 0,
                  'Noise': parseFloat((unpack(zoneRows, 'spl_risk').reduce((a, b) => a + (b || 0), 0) / zoneRows.length * 100).toFixed(1)) || 0,
                  'Light': parseFloat((unpack(zoneRows, 'lux_risk').reduce((a, b) => a + (b || 0), 0) / zoneRows.length * 100).toFixed(1)) || 0,
              };
              let totalCausePercentage = Object.values(sbsCauses).reduce((sum, val) => sum + val, 0);
              if (totalCausePercentage > 0 && Math.abs(totalCausePercentage - 100) > 0.1) {
                  for (const cause in sbsCauses) {
                      sbsCauses[cause] = parseFloat(((sbsCauses[cause] / totalCausePercentage) * 100).toFixed(1));
                  }
              }
              let currentSum = Object.values(sbsCauses).reduce((s, v) => s + v, 0);
              if (Math.abs(currentSum - 100) > 0.01 && currentSum > 0) {
                  let largestCause = null; let largestVal = -1;
                  for(const cause in sbsCauses){ if(sbsCauses[cause] > largestVal){ largestVal = sbsCauses[cause]; largestCause = cause; }}
                  if(largestCause) sbsCauses[largestCause] = parseFloat((sbsCauses[largestCause] + (100 - currentSum)).toFixed(1));
              }

              processedZoneData[zoneId] = {
                  name: `Zone ${zoneId}`,
                  // savedHours: staticHrsSaved,
                  absenteeism: staticAbsenteeism,
                  sbsCauses: sbsCauses,
                  dailyIEQData: [] // This will hold 24 hourly values for 10 days
              };

              // Step 1. Build a map: dayString → { countsPerHour: [ {co2,ta,rh,lux,spl,prod,sbs,count}, …24 of these ] }
              const dailyCountsMap = {};
              let hold = 0;

              // For each row, extract the UTC date (YYYY-MM-DD) and hour, then accumulate into that day’s countsPerHour
              zoneRows.forEach(row => {
                // Parse the timestamp; created_at is like "2019-01-01T00:00:00Z"
                const date = new Date(row.created_at);
                // Get the day in ISO format (e.g. "2019-01-01"). 
                // Using toISOString() ensures we group by the UTC date in the timestamp.
                const dayString = date.toISOString().slice(0, 10); // "YYYY-MM-DD"
                const hour = date.getUTCHours(); // 0–23 (UTC-based)

                // If this is the first time we see this day, initialize countsPerHour for 24 hours
                if (!dailyCountsMap[dayString]) {
                  dailyCountsMap[dayString] = {
                    countsPerHour: Array(24).fill(null).map(() => ({
                      co2: 0,
                      ta: 0,
                      rh: 0,
                      lux: 0,
                      spl: 0,
                      prod: 0,
                      sbs: 0,
                      hoursSaved: 0,
                      count: 0
                    }))
                  };
                }
                
                // Accumulate each IEQ metric into the proper hour slot
                const slot = dailyCountsMap[dayString].countsPerHour[hour];
                slot.co2 += parseFloat(row.co2) || 0;
                slot.ta += parseFloat(row.ta) || 0;
                slot.rh += parseFloat(row.rh) || 0;
                slot.lux += parseFloat(row.lux) || 0;
                slot.spl += parseFloat(row.spl) || 0;
                slot.prod += parseFloat(row.productivity_gains) || 0;
                slot.sbs += parseFloat(row.sbs_risk) || 0;
                slot.hoursSaved += parseFloat(row.hrs_saved) || 0;
                slot.count += 1;
              });

              // Step 2. For each day in dailyCountsMap, compute that day’s representativeHourlyMetrics,
              //         applying per-hour fallbacks if count === 0. Then push into dailyIEQData.
              const dailyIEQArray = []; // we’ll build one object per day here

              Object.keys(dailyCountsMap).forEach(dayString => {
                const { countsPerHour } = dailyCountsMap[dayString];

                // Create a fresh “template” with 7 arrays of length 24
                const rep = {
                  co2Data: Array(24).fill(0),
                  temperatureData: Array(24).fill(0),
                  humidityData: Array(24).fill(0),
                  lightData: Array(24).fill(0),
                  noiseData: Array(24).fill(0),
                  productivityData: Array(24).fill(0),
                  sbsRiskTimeSeriesData: Array(24).fill(0),
                  hrsSavedData: Array(24).fill(0)
                };

                // Compute per-hour averages (or apply fallback)
                for (let h = 0; h < 24; h++) {
                  const slot = countsPerHour[h];
                  if (slot.count > 0) {
                    // If we have actual readings for this hour:
                    rep.co2Data[h] = parseFloat((slot.co2 / slot.count).toFixed(1));
                    rep.temperatureData[h] = parseFloat((slot.ta / slot.count).toFixed(1));
                    rep.humidityData[h] = parseFloat((slot.rh / slot.count).toFixed(1));
                    rep.lightData[h] = parseFloat((slot.lux / slot.count).toFixed(1));
                    rep.noiseData[h] = parseFloat((slot.spl / slot.count).toFixed(1));
                    // Multiply by 100 because original code did (sum/count)*100
                    rep.productivityData[h] = parseFloat(((slot.prod / slot.count)).toFixed(1));
                    rep.sbsRiskTimeSeriesData[h] = parseFloat(((slot.sbs / slot.count)).toFixed(1));
                    rep.hrsSavedData[h] = parseFloat(((slot.hoursSaved / slot.count)).toFixed(1));
                  } else {
                    // Fallback: if no data for this hour, carry over from previous hour if exists, else use a default
                    const prevHour = h - 1;
                    rep.co2Data[h] = prevHour >= 0
                      ? rep.co2Data[prevHour]
                      : 600; // default CO₂
                    rep.temperatureData[h] = prevHour >= 0
                      ? rep.temperatureData[prevHour]
                      : 22; // default °C
                    rep.humidityData[h] = prevHour >= 0
                      ? rep.humidityData[prevHour]
                      : 45; // default %
                    rep.lightData[h] = prevHour >= 0
                      ? rep.lightData[prevHour]
                      : 300; // default lux
                    rep.noiseData[h] = prevHour >= 0
                      ? rep.noiseData[prevHour]
                      : 40; // default dB
                    rep.productivityData[h] = prevHour >= 0
                      ? rep.productivityData[prevHour]
                      : 0; // default %
                    rep.sbsRiskTimeSeriesData[h] = prevHour >= 0
                      ? rep.sbsRiskTimeSeriesData[prevHour]
                      : 0; // default %
                    rep.hrsSavedData[h] = prevHour >= 0
                      ? rep.hrsSavedData[prevHour]
                      : 0;
                  }
                }

                // Optionally, you can attach the dayString if you want:
                rep.date = dayString;
                dailyIEQArray.push(rep);
              });
              processedZoneData[zoneId.toString()].dailyIEQData = dailyIEQArray;
              
          });

          zoneData = processedZoneData;

          if (Object.keys(zoneData).length > 0) {
              zoneSelectorMobile.innerHTML = '';
              Object.keys(zoneData).forEach(zoneId => {
                  const option = document.createElement('option');
                  option.value = zoneId;
                  option.textContent = zoneData[zoneId].name;
                  zoneSelectorMobile.appendChild(option);
              });
              
              currentZoneId = Object.keys(zoneData)[0];
              if(zoneData[currentZoneId]) { // Ensure default zone exists
                  zoneSelectorMobile.value = currentZoneId;
                  updateSliderDateLabels();
                  updateFloorplanDataTextAndHeatmap(); // Initial update based on current date for all zones
                  collapseDetailedView();
              } else {
                   throw new Error("Default zone not found after processing CSV.");
              }

          } else {
              throw new Error("No valid zones processed from CSV.");
          }

      } catch (error) {
          console.error("Error loading or processing CSV:", error);
          const demoContainer = document.querySelector('.dashboard-container-embed');
          if (demoContainer) {
              demoContainer.innerHTML = `<p style="text-align:center; padding: 2rem; color: red;">Error loading dashboard data: ${error.message}. Please check the CSV file and path.</p>`;
          }
      }
  }


  function updateTimeSeriesChart() {
      const zone = zoneData[currentZoneId];
      if (dashboardPanelMain.classList.contains('collapsed') || !zone || !zone.dailyIEQData || !zone.dailyIEQData[currentDateIndex]) {
          timeSeriesChartDiv.innerHTML = ''; 
          return;
      }
      const dayData = zone.dailyIEQData[currentDateIndex];
      const leftData = dayData[currentLeftYAxisKey];
      const rightData = dayData[currentRightYAxisKey];
      const idealRange = idealIEQValues[currentLeftYAxisKey];

      if (!leftData || !rightData) {
          timeSeriesChartDiv.innerHTML = '<p style="text-align:center; padding:10px; font-size:0.8em;">Metric data unavailable.</p>';
          return;
      }

      const traces = [];
      if (idealRange) {
           traces.push({
              x: hourlyTimeLabels.concat(hourlyTimeLabels.slice().reverse()),
              y: Array(hourlyTimeLabels.length).fill(idealRange.min).concat(Array(hourlyTimeLabels.length).fill(idealRange.max).reverse()),
              fill: 'toself', fillcolor: 'rgba (0, 122, 255, 0.08)',
              line: { color: 'transparent' }, name: idealRange.label,
              hoverinfo: 'skip', showlegend: true, legendgroup: 'idealRange'
          });
      }

      traces.push({
          x: hourlyTimeLabels, y: leftData, name: getAxisLabel(currentLeftYAxisKey),
          type: 'scatter', mode: 'lines+markers',
          line: { color: '#007aff', width: 2 }, marker: { size: 5 }
      });
      traces.push({
          x: hourlyTimeLabels, y: rightData, name: getAxisLabel(currentRightYAxisKey),
          yaxis: 'y2', type: 'scatter', mode: 'lines+markers',
          line: { color: getComputedStyle(document.documentElement).getPropertyValue('--accent-color').includes('gradient') ? '#30d158' : 'var(--accent-color)', width: 2 },
           marker: { size: 5 }
      });

      const layout = {
          ...plotlyLayoutDefaults,
          yaxis: { title: {text: getAxisLabel(currentLeftYAxisKey), font:{size:11}}, side: 'left' },
          yaxis2: { title: {text: getAxisLabel(currentRightYAxisKey), font:{size:11}}, overlaying: 'y', side: 'right' },
          shapes: [],
          width: 480,
          height: 200
      };
      Plotly.react(timeSeriesChartDiv, traces, layout, plotlyConfig);
      timeSeriesChartTitleEl.textContent = `Hourly Trends for ${dailyDateLabels[currentDateIndex]}`;
  }

  function createSbsPieChart(sbsCausesData) {
    console.log('hhhhh', sbsCausesData, dashboardPanelMain.classList)
      if (dashboardPanelMain.classList.contains('collapsed') || !sbsCausesData) {
          sbsPieChartDiv.innerHTML = '';
          return;
      }
      const data = [{
          values: Object.values(sbsCausesData), labels: Object.keys(sbsCausesData),
          type: 'pie', hole: .45,
          marker: { colors: ['#007aff', '#ff6b81','#5856d6', '#ffdd57', '#30d158' ] },
          textinfo: "label+percent", textposition: "outside", insidetextorientation: 'radial', automargin: true,
          textfont: {size: 12}
      }];
      const layout = { ...plotlyLayoutDefaults, showlegend: false, margin: { t: 5, b: 5, l: 5, r: 5 }, width: 220, height: 220 };
      Plotly.react(sbsPieChartDiv, data, layout, plotlyConfig);
  }
  
  function calculateDailyAverage(zoneId, dateIndex, metricKey) {
      const zone = zoneData[zoneId];
      if (!zone || !zone.dailyIEQData || !zone.dailyIEQData[dateIndex] || !zone.dailyIEQData[dateIndex][metricKey]) {
          return 0; 
      }
      const hourlyValues = zone.dailyIEQData[dateIndex][metricKey];
      if (!hourlyValues || hourlyValues.length === 0) return 0; 
      const numericHourlyValues = hourlyValues.map(v => parseFloat(v) || 0).filter(v => !isNaN(v));
      if (numericHourlyValues.length === 0) return 0;
      return (numericHourlyValues.reduce((sum, val) => sum + val, 0) / numericHourlyValues.length);
  }


  function updateDashboardInfo() {
      if (!currentZoneId || !zoneData[currentZoneId]) {
          collapseDetailedView(); 
          return;
      }
      const data = zoneData[currentZoneId];

      const dailyAvgProdGain = calculateDailyAverage(currentZoneId, currentDateIndex, 'productivityData');
      const dailyAvgHrsSaved = calculateDailyAverage(currentZoneId, currentDateIndex, 'hrsSavedData');
      const dailyAvgSbsRisk = calculateDailyAverage(currentZoneId, currentDateIndex, 'sbsRiskTimeSeriesData');

      let sbsRiskLevel = 'Low';
      if (dailyAvgSbsRisk > 20) sbsRiskLevel = 'High';
      else if (dailyAvgSbsRisk >= 10) sbsRiskLevel = 'Medium';


      zoneTitlePanelEl.textContent = data.name;
      productivityGainEl.textContent = `${dailyAvgProdGain > 0 ? '▲' : '▼'} ${Math.abs(dailyAvgProdGain).toFixed(1)}%`;
      savedHoursEl.textContent = `${dailyAvgHrsSaved.toFixed(1)} hours`; 
      absenteeismEl.textContent = `${data.absenteeism > 0 ? '▲' : '▼'} ${Math.abs(data.absenteeism).toFixed(1)}%`; 
      sbsRiskEl.textContent = `${dailyAvgSbsRisk.toFixed(1)}%`;
      riskLevelEl.textContent = sbsRiskLevel;
      riskLevelEl.className = `risk-level ${sbsRiskLevel.toLowerCase()}`;

      svgZones.forEach(zone => zone.classList.toggle('active', zone.dataset.zoneId === currentZoneId));
      zoneSelectorMobile.value = currentZoneId;
      

      dashboardPanelMain.classList.remove('collapsed');
      floorplanArea.classList.add('panel-expanded');
      updateTimeSeriesChart();
      createSbsPieChart(data.sbsCauses); 
  }
  
  function updateFloorplanDataTextAndHeatmap() {
      console.log('here')
      svgZones.forEach(zoneEl => {
          const zoneId = zoneEl.dataset.zoneId;
          const data = zoneData[zoneId];
          if (data) {

              const dailyAvgProdGain = calculateDailyAverage(zoneId, currentDateIndex, 'productivityData');
              const dailyAvgSbsRisk = calculateDailyAverage(zoneId, currentDateIndex, 'sbsRiskTimeSeriesData');

              let lowClass, mediumClass, highClass, aClass;

              const bg = document.getElementById(`zone-zone${zoneId}-bg`);

              const isProductivity = currentFloorplanMetric === 'productivity'
            
              bg.style.fill = isProductivity ? getColorFromPercentage(dailyAvgProdGain) : getSBSColorFromPercentage(dailyAvgSbsRisk)
            
              const valueToDisplay = isProductivity ? dailyAvgProdGain : dailyAvgSbsRisk;
              const elementToUpdate =  zoneEl.querySelector('.productivity-data');

              elementToUpdate.textContent = `${valueToDisplay > 0 ? '▲' : '▼'}${valueToDisplay.toFixed(1)}%`;

              lowClass = 'productivity-low'; mediumClass = 'productivity-medium'; highClass = 'productivity-high';
              if (valueToDisplay > 10) aClass = highClass; else if (valueToDisplay < 5) aClass = lowClass; else aClass = mediumClass;

              if (currentFloorplanMetric !== 'productivity') {
                lowClass = 'sbs-risk-high'; mediumClass = 'sbs-risk-medium'; highClass = 'sbs-risk-low'; 
                if (valueToDisplay < 10) aClass = highClass; else if (valueToDisplay > 20) aClass = lowClass; else aClass = mediumClass;
              }

              if (valueToDisplay <= 3) {
                elementToUpdate.style.fill = 'rgb(87, 89, 87)';
              } else {
                elementToUpdate.style.fill = isProductivity ? 'green' : 'rgb(110, 88, 1)';
              }
              
              const pathElement = zoneEl.querySelector('path');
              if(pathElement) {
                  pathElement.classList.remove('productivity-high', 'productivity-medium', 'productivity-low', 'sbs-risk-low', 'sbs-risk-medium', 'sbs-risk-high');
                  pathElement.classList.add(aClass);
              }
          }
      });

      // Raw vs Translated toggle logic
        const rawBtn = document.getElementById("toggle-raw");
        const translatedBtn = document.getElementById("toggle-translated");
        const rawData = document.getElementById("raw-data");
        const translatedData = document.getElementById("translated-data");

        if (rawBtn && translatedBtn && rawData && translatedData) {
        rawBtn.addEventListener("click", () => {
            rawData.style.display = "block";
            translatedData.style.display = "none";
            rawBtn.classList.add("active");
            translatedBtn.classList.remove("active");
        });

        translatedBtn.addEventListener("click", () => {
            rawData.style.display = "none";
            translatedData.style.display = "block";
            translatedBtn.classList.add("active");
            rawBtn.classList.remove("active");
        });
        }

  }


  function updateSliderDateLabels() {
      sliderStartDateLabel.textContent = dailyDateLabels[0];
      sliderMidDateLabel.textContent = dailyDateLabels[Math.floor(dailyDateLabels.length / 2)];
      sliderEndDateLabel.textContent = dailyDateLabels[dailyDateLabels.length - 1];
  }

  function collapseDetailedView() {
      dashboardPanelMain.classList.add('collapsed');
      floorplanArea.classList.remove('panel-expanded');
      svgZones.forEach(zone => zone.classList.remove('active'));
      // currentZoneId = null; // Keep currentZoneId to allow reopening by clicking same zone if desired, or clear if explicit new click is needed
      sbsPieChartDiv.innerHTML = '';
      zoneTitlePanelEl.textContent = "Zone Details";
  }

  let lastClickTime = 0;
  let lastClickedZoneIdForDoubleClick = null; 

  svgZones.forEach(element => {
      element.addEventListener('click', (e) => {
          const clickTime = new Date().getTime();
          const zoneId = e.currentTarget.dataset.zoneId;
          console.log('yupp')
          if (currentZoneId === zoneId && !dashboardPanelMain.classList.contains('collapsed') && (clickTime - lastClickTime < 300) && lastClickedZoneIdForDoubleClick === zoneId) {
              collapseDetailedView();
              console.log('mmmmm')
          } else {
              currentZoneId = zoneId; 
              updateDashboardInfo();
              console.log('pppp')
          }
          lastClickTime = clickTime;
          lastClickedZoneIdForDoubleClick = zoneId; 
      });
      element.addEventListener('keypress', (e) => { 
          if (e.key === 'Enter' || e.key === ' ') {
              const zoneId = e.currentTarget.dataset.zoneId;
               if (currentZoneId === zoneId && !dashboardPanelMain.classList.contains('collapsed')) {
                  collapseDetailedView();
              } else {
                  currentZoneId = zoneId;
                  updateDashboardInfo();
              }
          }
      });
  });

  zoneSelectorMobile.addEventListener('change', (e) => {
      currentZoneId = e.target.value;
      updateDashboardInfo();
  });

  dateSlider.addEventListener('input', (e) => {
      currentDateIndex = parseInt(e.target.value, 10);
      dateSliderLabel.textContent = 'Date Filter: ' + e.target.value
      if (!dashboardPanelMain.classList.contains('collapsed') && currentZoneId && zoneData[currentZoneId]) { 
          updateDashboardInfo(); 
      }
      updateFloorplanDataTextAndHeatmap();

  });

  leftYAxisSelect.addEventListener('change', (e) => {
      currentLeftYAxisKey = e.target.value;
      if (!dashboardPanelMain.classList.contains('collapsed')) {
          updateTimeSeriesChart();
      }
  });
  rightYAxisSelect.addEventListener('change', (e) => {
      currentRightYAxisKey = e.target.value;
      if (!dashboardPanelMain.classList.contains('collapsed')) {
          updateTimeSeriesChart();
      }
  });

  floorplanMetricToggles.forEach(toggle => {
      toggle.addEventListener('change', (e) => {
          currentFloorplanMetric = e.target.value;
          updateFloorplanDataTextAndHeatmap();
      });
  });

  async function initializeDashboard() {
      await loadAndProcessCSV(); 
  }
  initializeDashboard();


  window.addEventListener('resize', () => {
      if (!dashboardPanelMain.classList.contains('collapsed')) {
          if (timeSeriesChartDiv.offsetParent !== null) Plotly.Plots.resize(timeSeriesChartDiv);
          if (sbsPieChartDiv.offsetParent !== null) Plotly.Plots.resize(sbsPieChartDiv);
      }
  });



  if (document.getElementById("sbs-mindmap")) {
    const width = Math.min(700, document.getElementById("sbs-mindmap").clientWidth || 700);
    const height = Math.min(600, width * 0.8); // Maintain aspect ratio

    const svg = d3.select("#sbs-mindmap")
      .html('') // Clear previous SVG if any
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("max-width", "700px")
      .style("margin", "auto")
      .append("g");

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const mindmapData = {
      name: "Sick Building Syndrome",
      children: [
        { name: "CO₂ (Air Quality)", children: [ { name: "Cognitive Decline" }, { name: "Headaches" }, { name: "Fatigue" } ] },
        { name: "Temperature", children: [ { name: "Discomfort" }, { name: "Fatigue" }, { name: "Respiratory Issues" } ] },
        { name: "Light", children: [ { name: "Eye Strain" }, { name: "Visual Discomfort" } ] },
        { name: "Noise", children: [ { name: "Stress" }, { name: "Malaise" }, { name: "Focus Disruption" } ] }
      ]
    };

    const root = d3.hierarchy(mindmapData);
    const nodes = root.descendants();
    const links = root.links();

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id || d.data.name).distance(width * 0.15).strength(0.5))
      .force("charge", d3.forceManyBody().strength(-width * 0.6))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(width * 0.06));

    const link = svg.append("g")
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1.5)
      .selectAll("line")
      .data(links)
      .join("line");

    const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", width * 0.015)
      .attr("fill", d => d.depth === 0 ? "#007aff" : d.children ? "#8884d8" : "#30d158")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .call(drag(simulation))
      .on("mouseover", function (event, d) {
        d3.select(this).attr("fill", "#ff9500");

        link
          .filter(l => l.source === d || l.target === d)
          .attr("stroke-width", 3)
          .attr("stroke", "#ff9500");
      })
      .on("mousemove", function (event, d) {
        link
          .filter(l => l.source === d || l.target === d)
          .attr("x2", l => l.target.x + (Math.random() * 8 - 4)) // wiggle effect
          .attr("y2", l => l.target.y + (Math.random() * 8 - 4));
      })
      .on("mouseout", function (event, d) {
        d3.select(this).attr("fill", d.children ? "#8884d8" : "#30d158");

        link
          .attr("stroke-width", 1.5)
          .attr("stroke", "#ccc");
      });

      const label = svg.append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text(d => d.data.name)
      .attr("font-size", `${Math.max(8, width * 0.018)}px`) // Responsive font size
      .attr("fill", "#333")
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle");

    simulation.on("tick", () => {
      link.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
      node.attr("cx", d => d.x).attr("cy", d => d.y);
      label.attr("x", d => d.x).attr("y", d => d.y - (width * 0.02)); // Adjust label offset based on size
    });

    function drag(simulation) {
      return d3.drag()
        .on("start", (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on("end", (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; });
    }
  }

// --- Hidden Cost: Toggle Logic + Charts  ---
if (
    document.getElementById("toggle-savings") &&
    document.getElementById("toggle-cognitive")
  ) {
    // 1) Render “Savings” bar chart into #ieq-cost-chart
    const costLabels = [
      "Asthma & Allergy <br> Absenteeism",
      "Enhanced Ventilation <br> (Health Benefits)",
      "Enhanced Ventilation <br> (Cognitive Gains)"
    ];
    const costValues = [3, 15, 10]; // in billions USD
  
    const costTrace = {
      x: costLabels,
      y: costValues,
      type: "bar",
      marker: {
        color: ['#007aff','#30d158','#ffdd57' ]
      },
      text: costValues.map(v => `$${v}B`),
      textposition: "outside"
    };
  
    const costLayout = {
      font: {family: "Helvetica, sans-serif", color: "#6e6e73"},
      title: {
        text: "Annual U.S. Savings from Improved IEQ",
        font: { size: 16 }
      },
      xaxis: { 
        title: "Improvement Area", 
        tickfont: { size: 11 },
        tickangle: 0,       // force horizontal labels
        automargin: true    // give Plotly room to avoid clipping
     },
      yaxis: { title: "Savings (Billions USD)", tickfont: { size: 11 }, automargin: true },
      margin: { l: 40, r: 20, t: 60, b: 100 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      width: 500,
      height: 350
    };
  
    Plotly.newPlot("ieq-cost-chart", [costTrace], costLayout, {
      displayModeBar: false,
      responsive: true
    });
  
    // 2) Render “Cognitive Gains” scatter plot into #cognitive-scatter
    const co2 = [950, 820, 780, 650, 600, 550, 400, 420, 380];
    const cognitiveBaseline = [60, 65, 68, 72, 74, 76, 80, 79, 82];
    const cognitiveEnhanced = [65, 70, 75, 80, 83, 85, 90, 92, 95];
  
    const traceBaseline = {
      x: co2,
      y: cognitiveBaseline,
      mode: "markers",
      name: "Baseline Ventilation",
      marker: { color: "#ff6b81", size: 8 }
    };
    const traceEnhanced = {
      x: co2,
      y: cognitiveEnhanced,
      mode: "markers",
      name: "Enhanced Ventilation",
      marker: { color: "#30d158", size: 8 }
    };
  
    const layoutScatter = {
      font: {family: "Helvetica, sans-serif", color: "#6e6e73"},
      title: "Cognitive Score vs. CO₂ Concentration",
      xaxis: { title: "CO₂ (ppm)", automargin: true },
      yaxis: { title: "Cognitive Score (index)", automargin: true },
      margin: { l: 40, r: 20, t: 60, b: 50 },
      hovermode: "closest",
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      legend: {
        orientation: "v",
        x: 100,
        xanchor: "right",
        y: 1.1,
        yanchor: "top",
        font: {size: 11 }
      },
      width: 500,
      height: 300
    };
  
    Plotly.newPlot(
      "cognitive-scatter",
      [traceBaseline, traceEnhanced],
      layoutScatter,
      { displayModeBar: false, responsive: true }
    );
  
    // 3) Toggle logic: switch between the two feature-cards
    const btnSavings = document.getElementById("toggle-savings");
    const btnCognitive = document.getElementById("toggle-cognitive");
    const cardSavings = document.getElementById("card-savings");
    const cardCognitive = document.getElementById("card-cognitive");
  
    btnSavings.addEventListener("click", () => {
      // Show the savings card, hide the cognitive card
      cardSavings.classList.replace("card-hidden", "card-visible");
      cardCognitive.classList.replace("card-visible", "card-hidden");
      btnSavings.classList.add("active");
      btnCognitive.classList.remove("active");
    });
  
    btnCognitive.addEventListener("click", () => {
      // Show the cognitive card, hide the savings card
      cardCognitive.classList.replace("card-hidden", "card-visible");
      cardSavings.classList.replace("card-visible", "card-hidden");
      btnCognitive.classList.add("active");
      btnSavings.classList.remove("active");
    });
  }
  // --- End Hidden Cost Toggle Logic ---
  
});

  
  
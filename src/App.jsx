import React, { useState, useEffect, useRef } from 'react';
// GitHub icon link fixed in the top-right is rendered inline

// Great Lakes HPC partition configurations with TRES billing weights
const PARTITION_RATES = {
  'standard': {
    name: 'Standard',
    defaultCores: 1,
    defaultMemoryPerCore: 7, // GB
    maxCores: 36,
    maxMemory: 180, // GB
    hasGPU: false,
    description: 'General purpose compute partition',
    billing: {
      cpu_weight: 2505,
      mem_weight: 358,
      gpu_weight: 0
    }
  },
  'debug': {
    name: 'Debug',
    defaultCores: 1,
    defaultMemoryPerCore: 7, // GB
    maxCores: 8,
    maxMemory: 40, // GB
    hasGPU: false,
    description: 'Debug partition for testing jobs',
    billing: {
      cpu_weight: 2505,
      mem_weight: 358,
      gpu_weight: 0
    }
  },
  'viz': {
    name: 'Visualization',
    defaultCores: 1,
    defaultMemoryPerCore: 7, // GB
    maxCores: 40,
    maxMemory: 180, // GB
    hasGPU: false,
    description: 'Visualization partition',
    billing: {
      cpu_weight: 2505,
      mem_weight: 358,
      gpu_weight: 0
    }
  },
  'largemem': {
    name: 'Large Memory',
    defaultCores: 1,
    defaultMemoryPerCore: 42, // GB (rounded from 41.75)
    maxCores: 36,
    maxMemory: 1503, // GB
    hasGPU: false,
    description: 'High memory nodes for memory-intensive jobs',
    billing: {
      cpu_weight: 7704,
      mem_weight: 185,
      gpu_weight: 0
    }
  },
  'gpu': {
    name: 'GPU',
    defaultCores: 20,
    defaultMemoryPerCore: 5, // GB (rounded from 4.5, 90GB / 20 cores)
    maxCores: 40,
    maxMemory: 180, // GB
    hasGPU: true,
    description: 'GPU-accelerated computing with V100 GPUs',
    billing: {
      cpu_weight: 1370,
      mem_weight: 304,
      gpu_weight: 27391
    }
  },
  'gpu_mig40': {
    name: 'MIG40 GPU',
    defaultCores: 8,
    defaultMemoryPerCore: 16, // GB (rounded from 15.625, 125GB / 8 cores)
    maxCores: 64,
    maxMemory: 1000, // GB
    hasGPU: true,
    description: 'GPU partition with 1/2 A100 GPU (40GB each)',
    billing: {
      cpu_weight: 3424,
      mem_weight: 221,
      gpu_weight: 27391
    }
  },
  'spgpu': {
    name: 'SPGPU',
    defaultCores: 4,
    defaultMemoryPerCore: 12, // GB (48GB / 4 cores)
    maxCores: 32,
    maxMemory: 372, // GB
    hasGPU: true,
    description: 'SPGPU partition with A40 GPUs',
    billing: {
      cpu_weight: 4520,
      mem_weight: 377,
      gpu_weight: 18079
    }
  }
};

function App() {
  const [jobType, setJobType] = useState('standard');
  const [partition, setPartition] = useState('standard');
  const [cores, setCores] = useState(1);
  const [memory, setMemory] = useState(7);
  const [gpus, setGpus] = useState(0);
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isArrayJob, setIsArrayJob] = useState(false);
  const [arrayJobCount, setArrayJobCount] = useState(1);
  const [showSbatch, setShowSbatch] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const sbatchRef = useRef(null);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDarkMode(shouldUseDark);
    document.documentElement.setAttribute('data-theme', shouldUseDark ? 'dark' : 'light');
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    const themeValue = newTheme ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', themeValue);
    localStorage.setItem('theme', themeValue);
  };

  // Handle SLURM script toggle with smooth scrolling
  const handleSbatchToggle = () => {
    const newShowSbatch = !showSbatch;
    setShowSbatch(newShowSbatch);
    
    // If expanding the script, scroll to it after a short delay to allow for expansion animation
    if (newShowSbatch && sbatchRef.current) {
      setTimeout(() => {
        sbatchRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });
      }, 150); // Wait for expansion to start
    }
  };

  // Handle copy to clipboard with feedback
  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateSbatchScript());
      setIsCopied(true);
      // Reset the copied state after 2 seconds
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Helper function to check if a value is empty or invalid
  const isValueEmpty = (value) => value === '' || value === null || value === undefined || isNaN(value);

  // Helper function to check if a value is out of range
  const isValueOutOfRange = (value, min, max) => {
    if (isValueEmpty(value)) return false;
    const numValue = Number(value);
    return numValue < min || numValue > max;
  };

  // Helper function to get the maximum cores for the current partition
  const getMaxCores = () => PARTITION_RATES[partition].maxCores;

  // Helper function to get the maximum memory for the current partition
  const getMaxMemory = () => PARTITION_RATES[partition].maxMemory;

  // Helper function to handle input changes that allow empty values and out-of-range values
  const handleInputChange = (setter, minValue = 0, maxValue = Infinity) => (e) => {
    const value = e.target.value;
    if (value === '') {
      setter('');
    } else {
      const numValue = parseInt(value);
      if (!isNaN(numValue)) {
        // Allow the value to be set even if out of range, so warnings can be shown
        setter(numValue);
      }
    }
  };

  // Helper function to validate total runtime doesn't exceed partition limits
  const validateTotalRuntime = (newDays, newHours, newMinutes, newSeconds) => {
    const totalMinutes = newDays * 24 * 60 + newHours * 60 + newMinutes + newSeconds / 60;
    
    // Get max runtime based on partition
    let maxMinutes;
    if (partition === 'debug') {
      maxMinutes = 4 * 60; // 4 hours
    } else if (partition === 'viz') {
      maxMinutes = 2 * 60; // 2 hours
    } else {
      maxMinutes = 14 * 24 * 60; // 14 days for all other partitions
    }
    
    return totalMinutes <= maxMinutes;
  };

  // Special handler for time inputs that allows out-of-range values for warnings
  const handleTimeInputChange = (setter, currentState, field) => (e) => {
    const value = e.target.value;
    if (value === '') {
      setter('');
      return;
    }
    
    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue < 0) return;
    
    // Allow the value to be set regardless of 14-day limit for warning display
    setter(numValue);
  };

  // Helper function to handle input focus and select text
  const handleInputFocus = (e) => {
    e.target.select();
  };

  // Helper function to prevent scroll wheel from changing number inputs
  const handleInputWheel = (e) => {
    e.target.blur();
  };

  // Update default values when partition changes
  useEffect(() => {
    const partitionData = PARTITION_RATES[partition];
    const defaultCores = jobType === 'standard' ? 1 : partitionData.defaultCores;
    setCores(defaultCores);
    setMemory(Math.round(defaultCores * partitionData.defaultMemoryPerCore));
    setGpus(partitionData.hasGPU ? 1 : 0);
  }, [partition, jobType]);

  // Update job configuration when job type changes
  useEffect(() => {
    if (jobType === 'array') {
      setIsArrayJob(true);
    } else {
      setIsArrayJob(false);
      setArrayJobCount(1);
    }
  }, [jobType]);

  // Calculate total runtime in minutes with safe defaults and clamping for calculations
  const safeValue = (value, defaultValue) => isValueEmpty(value) ? defaultValue : value;
  const clampedCores = Math.max(1, Math.min(getMaxCores(), safeValue(cores, 1)));
  const clampedMemory = Math.max(1, Math.min(getMaxMemory(), safeValue(memory, 1)));
  const clampedGpus = Math.max(0, Math.min(5, safeValue(gpus, 0)));
  const rawDays = safeValue(days, 0);
  const rawHours = safeValue(hours, 0);
  const rawMinutes = safeValue(minutes, 0);
  const rawSeconds = safeValue(seconds, 0);
  const safeArrayJobCount = Math.max(1, safeValue(arrayJobCount, 1));
  
  // Calculate total minutes from raw input
  const totalMinutes = rawDays * 24 * 60 + rawHours * 60 + rawMinutes + rawSeconds / 60;
  
  // Get max runtime based on partition
  let maxMinutes;
  if (partition === 'debug') {
    maxMinutes = 4 * 60; // 4 hours
  } else if (partition === 'viz') {
    maxMinutes = 2 * 60; // 2 hours
  } else {
    maxMinutes = 14 * 24 * 60; // 14 days for all other partitions
  }
  
  // Clamp total runtime to partition maximum for calculations
  const clampedTotalMinutes = Math.min(totalMinutes, maxMinutes);

  // Check if runtime exceeds partition limit
  const exceedsMaxRuntime = totalMinutes > maxMinutes;

  // Calculate cost using TRES billing weights
  const calculateCost = () => {
    const partitionData = PARTITION_RATES[partition];
    
    // Calculate billing using TRES formula with clamped values:
    // billing = int(max(cpu_weight * cpus, mem_weight * mem_gb, gpu_weight * gpus))
    const cpuBilling = partitionData.billing.cpu_weight * clampedCores;
    const memBilling = partitionData.billing.mem_weight * clampedMemory;
    const gpuBilling = partitionData.billing.gpu_weight * clampedGpus;
    
    const billing = Math.floor(Math.max(cpuBilling, memBilling, gpuBilling));
    
    // Calculate cost: cost = (total_minutes * billing) / 10000000
    const baseCost = (clampedTotalMinutes * billing) / 10000000;
    const totalCost = baseCost * (jobType === 'array' ? safeArrayJobCount : 1);

    return {
      total: totalCost,
      billing: billing,
      cpuBilling: cpuBilling,
      memBilling: memBilling,
      gpuBilling: gpuBilling,
      dominantFactor: billing === cpuBilling ? 'CPU' : billing === memBilling ? 'Memory' : 'GPU',
      arrayMultiplier: jobType === 'array' ? safeArrayJobCount : 1
    };
  };

  const cost = calculateCost();
  const currentPartition = PARTITION_RATES[partition];

  const formatTime = () => {
    // Use clamped values for display in cost breakdown
    const clampedDays = Math.floor(clampedTotalMinutes / (24 * 60));
    const remainingMinutes = clampedTotalMinutes % (24 * 60);
    const clampedHours = Math.floor(remainingMinutes / 60);
    const clampedMins = Math.floor(remainingMinutes % 60);
    const clampedSecs = Math.floor((clampedTotalMinutes % 1) * 60);
    
    const parts = [];
    if (clampedDays > 0) parts.push(`${clampedDays}d`);
    if (clampedHours > 0) parts.push(`${clampedHours}h`);
    if (clampedMins > 0) parts.push(`${clampedMins}m`);
    if (clampedSecs > 0) parts.push(`${clampedSecs}s`);
    return parts.join(' ') || '0m';
  };

  const generateSbatchScript = () => {
    const formatTimeForSlurm = () => {
      // Use clamped values for SLURM script
      const clampedDays = Math.floor(clampedTotalMinutes / (24 * 60));
      const remainingMinutes = clampedTotalMinutes % (24 * 60);
      const clampedHours = Math.floor(remainingMinutes / 60);
      const clampedMins = Math.floor(remainingMinutes % 60);
      const clampedSecs = Math.floor((clampedTotalMinutes % 1) * 60);
      
      // Format as days-hours:minutes:seconds for SLURM
      if (clampedDays > 0) {
        return `${clampedDays}-${clampedHours.toString().padStart(2, '0')}:${clampedMins.toString().padStart(2, '0')}:${clampedSecs.toString().padStart(2, '0')}`;
      } else {
        return `${clampedHours.toString().padStart(2, '0')}:${clampedMins.toString().padStart(2, '0')}:${clampedSecs.toString().padStart(2, '0')}`;
      }
    };

    const memoryPerNode = jobType === 'multicore' ? clampedMemory : Math.ceil(clampedMemory / clampedCores) * clampedCores;
    
    let script = '#!/bin/bash\n';
    script += `#SBATCH --job-name=${jobType === 'standard' ? 'single-core' : jobType}-job\n`;
    script += `#SBATCH --partition=${partition}\n`;
    
    if (jobType === 'array') {
      // Array jobs should not have --nodes or --ntasks
      // --cpus-per-task should equal the number of CPUs requested
      script += `#SBATCH --cpus-per-task=${clampedCores}\n`;
    } else if (jobType === 'multicore') {
      script += `#SBATCH --nodes=1\n`;
      script += `#SBATCH --ntasks=1\n`;
      script += `#SBATCH --cpus-per-task=${clampedCores}\n`;
    } else {
      script += `#SBATCH --nodes=1\n`;
      script += `#SBATCH --ntasks=${clampedCores}\n`;
      script += `#SBATCH --cpus-per-task=1\n`;
    }
    
    script += `#SBATCH --mem=${memoryPerNode}G\n`;
    script += `#SBATCH --time=${formatTimeForSlurm()}\n`;
    
    if (currentPartition.hasGPU && clampedGpus > 0) {
      script += `#SBATCH --gres=gpu:${clampedGpus}\n`;
    }
    
    if (jobType === 'array') {
      script += `#SBATCH --array=1-${safeArrayJobCount}\n`;
    }
    
    script += '#SBATCH --account=YOUR_ACCOUNT\n';
    script += '#SBATCH --mail-type=BEGIN,END,FAIL\n';
    script += '#SBATCH --mail-user=YOUR_EMAIL@umich.edu\n';
    script += '\n';
    script += '# Load necessary modules\n';
    script += '# module load python/3.9.0\n';
    script += '# module load gcc/9.2.0\n';
    script += '\n';
    
    if (jobType === 'multicore') {
      script += '# Run multicore job (shared memory)\n';
      script += 'your_multicore_program\n';
    } else if (jobType === 'array') {
      script += '# Run array job\n';
      script += 'echo "Array job ID: $SLURM_ARRAY_TASK_ID"\n';
      script += 'your_program --input-file input_${SLURM_ARRAY_TASK_ID}.txt\n';
    } else {
      script += '# Run single core job\n';
      script += 'your_program\n';
    }
    
    return script;
  };

  return (
    <>
            <div className="top-controls">
        <button 
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
        >
          <svg width="24" height="24" className={`theme-icon ${isDarkMode ? 'sun-icon' : 'moon-icon'}`}>
            {isDarkMode ? (
              // Sun icon for dark mode (click to go to light)
              <>
                <circle cx="12" cy="12" r="4" fill="currentColor" />
                <line
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  x1="12"
                  y1="2"
                  x2="12"
                  y2="5"
                />
                <line
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  x1="12"
                  y1="19"
                  x2="12"
                  y2="22"
                />
                <line
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  x1="4.93"
                  y1="4.93"
                  x2="7.05"
                  y2="7.05"
                />
                <line
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  x1="16.95"
                  y1="16.95"
                  x2="19.07"
                  y2="19.07"
                />
                <line
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  x1="2"
                  y1="12"
                  x2="5"
                  y2="12"
                />
                <line
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  x1="19"
                  y1="12"
                  x2="22"
                  y2="12"
                />
                <line
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  x1="4.93"
                  y1="19.07"
                  x2="7.05"
                  y2="16.95"
                />
                <line
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  x1="16.95"
                  y1="7.05"
                  x2="19.07"
                  y2="4.93"
                />
              </>
            ) : (
              // Moon icon for light mode (click to go to dark)
              <path
                fill="currentColor"
                d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
              />
            )}
          </svg>
        </button>
        <a
          href="https://github.com/um-jglad/um-gl-cost-calc"
          target="_blank"
          rel="noopener noreferrer"
          className="github-link"
          aria-label="View source on GitHub"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59
                 .4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49
                 -2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
                 -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82
                 .72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07
                 -1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15
                 -.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82
                 .64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27
                 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12
                 .51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95
                 .29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2
                 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8
                 c0-4.42-3.58-8-8-8z"
            />
          </svg>
        </a>
      </div>
      <div className="app">
        <div className="header">
          <h1>Great Lakes HPC Cost Calculator</h1>
          <p>Calculate the cost of your HPC jobs on the University of Michigan Great Lakes cluster</p>
        </div>

        <div className="calculator">
          <div className="form-section">
            <h3>Job Configuration</h3>
            
            <div className="form-group">
              <label htmlFor="jobType">Job Type</label>
              <select 
                id="jobType"
                value={jobType} 
                onChange={(e) => setJobType(e.target.value)}
              >
                <option value="standard">Single Core Job</option>
                <option value="multicore">Multicore Job</option>
                <option value="array">Array Job</option>
              </select>
              <div className="partition-info">
                <p>
                  {jobType === 'standard' && 'Single core job (1 node, 1 task, 1 core)'}
                  {jobType === 'multicore' && 'Single task job using multiple cores (shared memory)'}
                  {jobType === 'array' && 'Multiple independent jobs with the same resource requirements'}
                </p>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="partition">Partition</label>
              <select 
                id="partition"
                value={partition} 
                onChange={(e) => setPartition(e.target.value)}
              >
                {Object.entries(PARTITION_RATES).map(([key, data]) => (
                  <option key={key} value={key}>{data.name}</option>
                ))}
              </select>
              <div className="partition-info">
                <p>{currentPartition.description}</p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="cores">CPU Cores</label>
                <input 
                  type="number" 
                  id="cores"
                  min="1" 
                  max={jobType === 'standard' ? 1 : getMaxCores()}
                  value={cores} 
                  className={isValueEmpty(cores) ? 'warning' : isValueOutOfRange(cores, 1, jobType === 'standard' ? 1 : getMaxCores()) ? 'error' : ''}
                  onChange={handleInputChange(setCores, 1, jobType === 'standard' ? 1 : getMaxCores())}
                  onFocus={handleInputFocus}
                  onWheel={handleInputWheel}
                  disabled={jobType === 'standard'}
                />
                {jobType === 'standard' && cores > 1 && (
                  <div className="warning-message">
                    ⚠️ Standard jobs are limited to 1 core. Consider switching to "Multicore Job" for multiple cores.
                  </div>
                )}
                {jobType !== 'standard' && isValueOutOfRange(cores, 1, getMaxCores()) && (
                  <div className="warning-message">
                    ⚠️ Value must be between 1 and {getMaxCores()} cores
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="memory">Memory (GB)</label>
                <input 
                  type="number" 
                  id="memory"
                  min="1" 
                  max={getMaxMemory()}
                  value={memory} 
                  className={isValueEmpty(memory) ? 'warning' : isValueOutOfRange(memory, 1, getMaxMemory()) ? 'error' : ''}
                  onChange={handleInputChange(setMemory, 1, getMaxMemory())}
                  onFocus={handleInputFocus}
                  onWheel={handleInputWheel}
                />
                {isValueOutOfRange(memory, 1, getMaxMemory()) && (
                  <div className="warning-message">
                    ⚠️ Value must be between 1 and {getMaxMemory()} GB
                  </div>
                )}
              </div>
            </div>

            {currentPartition.hasGPU && (
              <div className="form-group">
                <label htmlFor="gpus">GPUs</label>
                <input 
                  type="number" 
                  id="gpus"
                  min="0" 
                  max="5"
                  value={gpus} 
                  className={isValueEmpty(gpus) && currentPartition.hasGPU ? 'warning' : isValueOutOfRange(gpus, 0, 5) ? 'error' : ''}
                  onChange={handleInputChange(setGpus, 0, 5)}
                  onFocus={handleInputFocus}
                  onWheel={handleInputWheel}
                />
                {isValueOutOfRange(gpus, 0, 5) && (
                  <div className="warning-message">
                    ⚠️ Value must be between 0 and 5 GPUs
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <div className={`collapsible-content ${jobType === 'array' ? 'expanded' : 'collapsed'}`}>
                <div className="array-input-container">
                  <label htmlFor="arrayJobCount">Number of Jobs in Array</label>
                  <input 
                    type="number" 
                    id="arrayJobCount"
                    min="1" 
                    value={arrayJobCount} 
                    className={isValueEmpty(arrayJobCount) ? 'warning' : isValueOutOfRange(arrayJobCount, 1, Infinity) ? 'error' : ''}
                    onChange={handleInputChange(setArrayJobCount, 1)}
                    onFocus={handleInputFocus}
                    onWheel={handleInputWheel}
                    placeholder="Enter number of array jobs"
                  />
                  {isValueOutOfRange(arrayJobCount, 1, Infinity) && (
                    <div className="warning-message">
                      ⚠️ Value must be at least 1
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Runtime</h3>
            <div className="time-inputs">
              <div className="form-group">
                <label htmlFor="days">Days</label>
                <input 
                  type="number" 
                  id="days"
                  min="0" 
                  value={days} 
                  className={exceedsMaxRuntime ? 'error' : ''}
                  onChange={handleTimeInputChange(setDays, { days, hours, minutes, seconds }, 'days')}
                  onFocus={handleInputFocus}
                  onWheel={handleInputWheel}
                />
              </div>
              <div className="form-group">
                <label htmlFor="hours">Hours</label>
                <input 
                  type="number" 
                  id="hours"
                  min="0" 
                  value={hours} 
                  className={exceedsMaxRuntime ? 'error' : ''}
                  onChange={handleTimeInputChange(setHours, { days, hours, minutes, seconds }, 'hours')}
                  onFocus={handleInputFocus}
                  onWheel={handleInputWheel}
                />
              </div>
              <div className="form-group">
                <label htmlFor="minutes">Minutes</label>
                <input 
                  type="number" 
                  id="minutes"
                  min="0" 
                  value={minutes} 
                  className={exceedsMaxRuntime ? 'error' : ''}
                  onChange={handleTimeInputChange(setMinutes, { days, hours, minutes, seconds }, 'minutes')}
                  onFocus={handleInputFocus}
                  onWheel={handleInputWheel}
                />
              </div>
              <div className="form-group">
                <label htmlFor="seconds">Seconds</label>
                <input 
                  type="number" 
                  id="seconds"
                  min="0" 
                  value={seconds} 
                  className={exceedsMaxRuntime ? 'error' : ''}
                  onChange={handleTimeInputChange(setSeconds, { days, hours, minutes, seconds }, 'seconds')}
                  onFocus={handleInputFocus}
                  onWheel={handleInputWheel}
                />
              </div>
            </div>
            {exceedsMaxRuntime && (
              <div className="runtime-warning">
                ⚠️ Warning: Runtime exceeds {
                  partition === 'debug' ? '4-hour' : 
                  partition === 'viz' ? '2-hour' : 
                  '14-day'
                } maximum limit for {partition} partition. Please reduce the total runtime.
              </div>
            )}
          </div>

          <div className="results">
            <h3>Estimated Job Cost</h3>
            <div className="cost-display">
              ${cost.total.toFixed(2)}
            </div>
            
            <div className="cost-breakdown">
              <h4>Cost Breakdown</h4>
              <div className="breakdown-item">
                <span>Job Type:</span>
                <span>{jobType === 'standard' ? 'Single Core' : jobType === 'multicore' ? 'Multicore' : 'Array'}</span>
              </div>
              <div className="breakdown-item">
                <span>Partition:</span>
                <span>{currentPartition.name}</span>
              </div>
              <div className="breakdown-item">
                <span>Runtime:</span>
                <span>{formatTime()}</span>
              </div>
              <div className="breakdown-item">
                <span>Cores:</span>
                <span>{clampedCores}</span>
              </div>
              <div className="breakdown-item">
                <span>Memory:</span>
                <span>{clampedMemory} GB</span>
              </div>
              {currentPartition.hasGPU && (
                <div className="breakdown-item">
                  <span>GPUs:</span>
                  <span>{clampedGpus}</span>
                </div>
              )}
              {jobType === 'array' && (
                <div className="breakdown-item">
                  <span>Array Jobs:</span>
                  <span>{safeArrayJobCount}</span>
                </div>
              )}
              <div className="breakdown-item">
                <span>Total minutes:</span>
                <span>{clampedTotalMinutes.toFixed(2)}</span>
              </div>
              {jobType === 'array' && (
                <div className="breakdown-item">
                  <span>Cost per job:</span>
                  <span>${(cost.total / cost.arrayMultiplier).toFixed(6)}</span>
                </div>
              )}
            </div>
            <p style={{ marginTop: '8px', fontSize: '0.9rem', opacity: '0.9' }}>
              This is the maximum cost estimate. Actual cost may be lower dependent on runtime.
            </p>
            
            <div style={{ marginTop: '16px' }}>
              <button 
                onClick={handleSbatchToggle}
                style={{
                  background: 'var(--toggle-bg)',
                  color: 'var(--results-text)',
                  border: '1px solid var(--toggle-border)',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--toggle-hover-bg)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'var(--toggle-bg)';
                }}
              >
                {showSbatch ? 'Hide' : 'Show'} SLURM Script
              </button>
            </div>
          </div>

          <div ref={sbatchRef} className={`collapsible-content ${showSbatch ? 'expanded' : 'collapsed'}`}>
            <div className="form-section sbatch-section">
              <h3>Example SLURM Batch Script</h3>
              <div style={{
                background: 'var(--sbatch-bg)',
                color: 'var(--sbatch-text)',
                padding: '16px',
                borderRadius: '8px',
                fontFamily: 'Monaco, Consolas, "Lucida Console", monospace',
                fontSize: '0.85rem',
                lineHeight: '1.4',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                position: 'relative'
              }}>
                <button
                  onClick={handleCopyToClipboard}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: isCopied ? 'var(--success-color)' : 'var(--sbatch-button-bg)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  {isCopied ? 'Copied!' : 'Copy'}
                </button>
                {generateSbatchScript()}
              </div>
              <p style={{ marginTop: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Save this as a <code>.sbatch</code> file and submit with: <code>sbatch your_script.sbatch</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;

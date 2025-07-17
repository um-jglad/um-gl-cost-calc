import { useState, useEffect } from 'react';

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
    setCores(partitionData.defaultCores);
    setMemory(Math.round(partitionData.defaultCores * partitionData.defaultMemoryPerCore));
    setGpus(partitionData.hasGPU ? 1 : 0);
  }, [partition]);

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
    script += `#SBATCH --job-name=${jobType}-job\n`;
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
      script += '# Run standard job\n';
      script += 'your_program\n';
    }
    
    return script;
  };

  return (
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
              <option value="standard">Standard Job</option>
              <option value="multicore">Multicore Job</option>
              <option value="array">Array Job</option>
            </select>
            <div className="partition-info">
              <p>
                {jobType === 'standard' && 'Single task job running on one core'}
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
                max={getMaxCores()}
                value={cores} 
                className={isValueEmpty(cores) ? 'warning' : isValueOutOfRange(cores, 1, getMaxCores()) ? 'error' : ''}
                onChange={handleInputChange(setCores, 1, getMaxCores())}
                onFocus={handleInputFocus}
                onWheel={handleInputWheel}
              />
              {isValueOutOfRange(cores, 1, getMaxCores()) && (
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

          {jobType === 'array' && (
            <div className="form-group">
              <div className="array-input-container visible">
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
          )}
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
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#dc2626',
              padding: '12px',
              borderRadius: '8px',
              marginTop: '12px',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
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
              <span>{jobType === 'standard' ? 'Standard' : jobType === 'multicore' ? 'Multicore' : 'Array'}</span>
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
              onClick={() => setShowSbatch(!showSbatch)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              {showSbatch ? 'Hide' : 'Show'} SLURM Script
            </button>
          </div>
        </div>

        {showSbatch && (
          <div className="form-section">
            <h3>Example SLURM Batch Script</h3>
            <div style={{
              background: '#2d3748',
              color: '#e2e8f0',
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
                onClick={() => navigator.clipboard.writeText(generateSbatchScript())}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: '#4a5568',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Copy
              </button>
              {generateSbatchScript()}
            </div>
            <p style={{ marginTop: '12px', fontSize: '0.9rem', color: '#718096' }}>
              Save this as a <code>.sbatch</code> file and submit with: <code>sbatch your_script.sbatch</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

import { useState, useEffect } from 'react';

// Great Lakes HPC partition configurations with TRES billing weights
const PARTITION_RATES = {
  'standard': {
    name: 'Standard',
    defaultCores: 1,
    defaultMemoryPerCore: 7, // GB
    maxCores: 36,
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
    maxCores: 36,
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
    maxCores: 36,
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
    maxCores: 20,
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
    maxCores: 8,
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
    maxCores: 4,
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

  // Helper function to handle input changes that allow empty values
  const handleInputChange = (setter, minValue = 0) => (e) => {
    const value = e.target.value;
    if (value === '') {
      setter('');
    } else {
      const numValue = parseInt(value);
      if (!isNaN(numValue)) {
        setter(Math.max(minValue, numValue));
      }
    }
  };

  // Helper function to handle input focus and select text
  const handleInputFocus = (e) => {
    e.target.select();
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

  // Calculate total runtime in minutes with safe defaults
  const safeValue = (value, defaultValue) => isValueEmpty(value) ? defaultValue : value;
  const safeCores = safeValue(cores, 1);
  const safeMemory = safeValue(memory, 1);
  const safeGpus = safeValue(gpus, 0);
  const safeDays = safeValue(days, 0);
  const safeHours = safeValue(hours, 0);
  const safeMinutes = safeValue(minutes, 0);
  const safeSeconds = safeValue(seconds, 0);
  const safeArrayJobCount = safeValue(arrayJobCount, 1);
  
  const totalMinutes = safeDays * 24 * 60 + safeHours * 60 + safeMinutes + safeSeconds / 60;

  // Calculate cost using TRES billing weights
  const calculateCost = () => {
    const partitionData = PARTITION_RATES[partition];
    
    // Calculate billing using TRES formula:
    // billing = int(max(cpu_weight * cpus, mem_weight * mem_gb, gpu_weight * gpus))
    const cpuBilling = partitionData.billing.cpu_weight * safeCores;
    const memBilling = partitionData.billing.mem_weight * safeMemory;
    const gpuBilling = partitionData.billing.gpu_weight * safeGpus;
    
    const billing = Math.floor(Math.max(cpuBilling, memBilling, gpuBilling));
    
    // Calculate cost: cost = (total_minutes * billing) / 10000000
    const baseCost = (totalMinutes * billing) / 10000000;
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
    const parts = [];
    if (safeDays > 0) parts.push(`${safeDays}d`);
    if (safeHours > 0) parts.push(`${safeHours}h`);
    if (safeMinutes > 0) parts.push(`${safeMinutes}m`);
    if (safeSeconds > 0) parts.push(`${safeSeconds}s`);
    return parts.join(' ') || '0m';
  };

  const generateSbatchScript = () => {
    const formatTimeForSlurm = () => {
      const totalHours = safeDays * 24 + safeHours;
      return `${totalHours.toString().padStart(2, '0')}:${safeMinutes.toString().padStart(2, '0')}:${safeSeconds.toString().padStart(2, '0')}`;
    };

    const memoryPerNode = jobType === 'multicore' ? safeMemory : Math.ceil(safeMemory / safeCores) * safeCores;
    
    let script = '#!/bin/bash\n';
    script += `#SBATCH --job-name=${jobType}-job\n`;
    script += `#SBATCH --partition=${partition}\n`;
    script += `#SBATCH --nodes=1\n`;
    
    if (jobType === 'multicore') {
      script += `#SBATCH --ntasks=1\n`;
      script += `#SBATCH --cpus-per-task=${safeCores}\n`;
    } else {
      script += `#SBATCH --ntasks=${safeCores}\n`;
      script += `#SBATCH --cpus-per-task=1\n`;
    }
    
    script += `#SBATCH --mem=${memoryPerNode}G\n`;
    script += `#SBATCH --time=${formatTimeForSlurm()}\n`;
    
    if (currentPartition.hasGPU && safeGpus > 0) {
      script += `#SBATCH --gres=gpu:${safeGpus}\n`;
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
                max={currentPartition.maxCores}
                value={cores} 
                className={isValueEmpty(cores) ? 'warning' : ''}
                onChange={handleInputChange(setCores, 1)}
                onFocus={handleInputFocus}
              />
            </div>
            <div className="form-group">
              <label htmlFor="memory">Memory (GB)</label>
              <input 
                type="number" 
                id="memory"
                min="1" 
                value={memory} 
                className={isValueEmpty(memory) ? 'warning' : ''}
                onChange={handleInputChange(setMemory, 1)}
                onFocus={handleInputFocus}
              />
            </div>
          </div>

          {currentPartition.hasGPU && (
            <div className="form-group">
              <label htmlFor="gpus">GPUs</label>
              <input 
                type="number" 
                id="gpus"
                min="0" 
                max="4"
                value={gpus} 
                className={isValueEmpty(gpus) && currentPartition.hasGPU ? 'warning' : ''}
                onChange={handleInputChange(setGpus, 0)}
                onFocus={handleInputFocus}
              />
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
                  className={isValueEmpty(arrayJobCount) ? 'warning' : ''}
                  onChange={handleInputChange(setArrayJobCount, 1)}
                  onFocus={handleInputFocus}
                  placeholder="Enter number of array jobs"
                />
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
                onChange={handleInputChange(setDays, 0)}
                onFocus={handleInputFocus}
              />
            </div>
            <div className="form-group">
              <label htmlFor="hours">Hours</label>
              <input 
                type="number" 
                id="hours"
                min="0" 
                max="23"
                value={hours} 
                onChange={handleInputChange(setHours, 0)}
                onFocus={handleInputFocus}
              />
            </div>
            <div className="form-group">
              <label htmlFor="minutes">Minutes</label>
              <input 
                type="number" 
                id="minutes"
                min="0" 
                max="59"
                value={minutes} 
                onChange={handleInputChange(setMinutes, 0)}
                onFocus={handleInputFocus}
              />
            </div>
            <div className="form-group">
              <label htmlFor="seconds">Seconds</label>
              <input 
                type="number" 
                id="seconds"
                min="0" 
                max="59"
                value={seconds} 
                onChange={handleInputChange(setSeconds, 0)}
                onFocus={handleInputFocus}
              />
            </div>
          </div>
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
              <span>{safeCores}</span>
            </div>
            <div className="breakdown-item">
              <span>Memory:</span>
              <span>{safeMemory} GB</span>
            </div>
            {currentPartition.hasGPU && (
              <div className="breakdown-item">
                <span>GPUs:</span>
                <span>{safeGpus}</span>
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
              <span>{totalMinutes.toFixed(2)}</span>
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

# Great Lakes HPC Cost Calculator

A modern web application for calculating job costs on the University of Michigan Great Lakes High Performance Computing cluster.

## Features

- **Accurate Rate Calculations**: Uses the official rates from the Great Lakes HPC system
- **Multiple Partitions**: Support for all major partitions (standard, largemem, gpu, spgpu, gpu_mig40)
- **Real-time Cost Updates**: Instant cost calculations as you adjust parameters
- **Responsive Design**: Works on desktop and mobile devices
- **Detailed Breakdown**: Shows cost breakdown by components and configuration
- **Large Memory**: High memory nodes (CPU=7704, Memory=185)
- **GPU**: GPU-accelerated computing (CPU=1370, Memory=304, GPU=27391)
- **SPGPU**: Shared GPU partition (CPU=4520, Memory=377, GPU=18079)
- **GPU MIG40**: Multi-Instance GPU partition (CPU=3424, Memory=221, GPU=27391)

> [!NOTE]
> Billing weights were pulled from Great Lakes using `sacctmgr` on 07/01/2025

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

### Building for Production

 
```bash
npm run build
```

 
The built files will be in the `dist` directory.

## Usage

1. **Select Job Type**: Choose between Single Core, Multicore, or Array job
   - **Single Core Job**: Limited to 1 core (1 node, 1 task, 1 core)
   - **Multicore Job**: For jobs requiring multiple cores with shared memory
   - **Array Job**: For multiple independent jobs with identical resource requirements
2. **Select Partition**: Choose the appropriate partition for your job
3. **Configure Resources**:
   - Set the number of CPU cores needed (automatically set to 1 for Single Core jobs)
   - Specify memory requirements
   - For GPU partitions, set the number of GPUs
   - For Array jobs, set the number of jobs in the array
4. **Set Runtime**: Enter the expected job duration (days, hours, minutes, seconds)
5. **View Cost**: The estimated cost will be calculated automatically, including detailed breakdown
6. **Generate SLURM Script**: Expand the SLURM script section to view and copy an example batch script

## Cost Calculation

The calculator uses the official Great Lakes TRES billing weights and calculates costs as follows:

- **Billing Formula**:  
  `billing = max(cpu_weight × cores, mem_weight × memory_GB, gpu_weight × gpus)`  
  (weights depend on partition; see above)
- **Cost Formula**:  
  `cost = (total_minutes × billing) ÷ 10,000,000`

The dominant resource (CPU, memory, or GPU) determines the billing for each job. The calculator displays a detailed breakdown of each component and which factor is dominant.

## Important Notes

- Costs shown are **maximum estimates** and don't account for:
  - UMRCP (University of Michigan Research Computing Package) allocations
  - Unit cost-sharing programs
  - Other funding sources

- For accurate billing information, always use the official `my_job_estimate` command on Great Lakes

- This calculator now uses the same TRES billing weights and formulas as the official system for maximum accuracy.

## Rates Source

Rates are based on the [official University of Michigan Great Lakes service rates](https://its.umich.edu/advanced-research-computing/high-performance-computing/great-lakes/rates).

# Great Lakes HPC Cost Calculator

A modern web application for calculating job costs on the University of Michigan Great Lakes High Performance Computing cluster.

## Features

- **Accurate Rate Calculations**: Uses the official rates from the Great Lakes HPC system
- **Multiple Partitions**: Support for all major partitions (standard, largemem, gpu, spgpu, gpu_mig40)
- **Real-time Cost Updates**: Instant cost calculations as you adjust parameters
- **Responsive Design**: Works on desktop and mobile devices
- **Detailed Breakdown**: Shows cost breakdown by components and configuration

## Supported Partitions & Billing Weights

- **Standard/Debug/Viz**: General purpose compute (CPU=2505, Memory=358)
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

1. **Select Partition**: Choose the appropriate partition for your job
2. **Configure Resources**:
   - Set the number of CPU cores needed
   - Specify memory requirements
   - For GPU partitions, set the number of GPUs
3. **Set Runtime**: Enter the expected job duration (days, hours, minutes, seconds)
4. **View Cost**: The estimated cost will be calculated automatically

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

Rates are based on the official University of Michigan Great Lakes service rates:
https://its.umich.edu/advanced-research-computing/high-performance-computing/great-lakes/rates

# multimodal_ib：disentanglement toy 实验线最小可运行路径体检

> 范围：`bin/remove_msi.py`、`bin/run_alignment.py`、`bin/run_regularization.py`  
> 约束：不改训练逻辑，仅梳理入口、调用链、配置、输出与数据依赖。

## 1) 目录树摘要（聚焦 toy 线）

```text
multimodal_ib/
├── bin/
│   ├── remove_msi.py
│   ├── run_alignment.py
│   └── run_regularization.py
├── configs/
│   └── disentanglement/
│       ├── dsprites*.yaml
│       ├── mpi3d*.yaml
│       └── shapes3d*.yaml
├── src/
│   ├── experiments/
│   │   └── disentanglement/
│   │       ├── __init__.py
│   │       ├── base.py
│   │       ├── datasets.py
│   │       ├── remove_msi.py
│   │       ├── alignment.py
│   │       ├── regularization.py
│   │       └── encoders/
│   │           ├── __init__.py
│   │           ├── cifar_resnet.py
│   │           ├── resnet.py
│   │           ├── mlp.py
│   │           └── vit.py
│   └── helpers/
│       ├── training.py
│       └── metrics/
│           └── alignment.py
└── results/   # 运行时自动生成
```

---

## 2) 三个脚本的真实入口、参数、调用链

## A. `bin/remove_msi.py`

### 入口与参数
- 入口：`python bin/remove_msi.py <config_file> <missing_factor> [--seed] [--temperature] [--img_encoder]`
- 参数：
  - `config_file`（必填）
  - `missing_factor`（必填）
  - `--seed`（默认 `42`）
  - `--temperature`（默认 `None`，覆盖 config）
  - `--img_encoder`（默认 `None`，覆盖 config 的 `encoder1.arch`）

### 真实调用链
1. `bin/remove_msi.py`
2. `src.experiments.disentanglement.RemoveMSIExperiment`
3. `src/experiments/disentanglement/remove_msi.py`
4. 继承 `DisentanglementExperiment`（`src/experiments/disentanglement/base.py`）
5. 依赖：
   - 数据：`src/experiments/disentanglement/datasets.py`
   - 编码器：`src/experiments/disentanglement/encoders/*`
   - 训练工具：`src/helpers/training.py`
6. 训练/评估主循环：`DisentanglementExperiment.run_all()`

### 读取哪个 config
- 读取路径：`configs/disentanglement/<config_file>.yaml`
- 读取逻辑：`src/helpers/training.py::read_config()`（会自动拼接 `.yaml`）

### config 关键字段
- `data.dataset`：`DSprites|MPI3D|SHAPES3D`
- `data.filepath`：数据文件路径（本地绝对路径）
- `data.n_samples`：采样数量
- `encoder1`：图像编码器（如 `resnet20` / `mlp-flatten` / `tiny_vit`）
- `encoder2`：factor 编码器（通常 `mlp`）
- `training.n_epochs / save_epochs / batch_size`
- `training.optimizer.*`
- `training.scheduler.*`
- （可被参数覆盖）`training.temperature`、`encoder1.arch`

### 最终输出保存位置
- 基目录：`results/<config_file>/`
- 模型：`results/<config_file>/models/epoch_*.pt`
- 训练指标：通过 `wandb.init(..., project='remove-msi')` 记录（默认在线）

### 数据集依赖与下载逻辑
- **依赖预先下载好的数据**（`npz/h5`）。
- 路径来自 config（例如 `/mnt/cephfs/...`）。
- 代码中**没有自动下载逻辑**；`datasets.py`只负责读本地文件并切分。

---

## B. `bin/run_alignment.py`

### 入口与参数
- 入口：`python bin/run_alignment.py <config_file> [--seed]`
- 参数：
  - `config_file`（必填）
  - `--seed`（默认 `42`）

### 真实调用链
1. `bin/run_alignment.py`
2. `src.experiments.disentanglement.AlignmentExperiment`
3. `src/experiments/disentanglement/alignment.py`
4. 继承 `DisentanglementExperiment`（`src/experiments/disentanglement/base.py`）
5. 额外依赖：
   - 对齐指标：`src/helpers/metrics/alignment.py`（`AlignmentMetrics`）
   - 训练工具：`src/helpers/training.py`
   - 数据：`src/experiments/disentanglement/datasets.py`
6. 主循环：`DisentanglementExperiment.run_all()`，每轮调用 `evaluate()`

### 读取哪个 config
- 读取路径：`configs/disentanglement/<config_file>.yaml`

### config 关键字段
- 与 `remove_msi` 相同（`data`、`encoder1/2`、`training.*`）。
- 重点：`data.dataset` 决定因子集合，`alignment.py`会随机划分 essence / nuisances（受 seed 影响）。

### 最终输出保存位置
- 基目录：`results/<config_file>/`
- 模型：`results/<config_file>/models/epoch_*.pt`
- 指标：`wandb` project=`alignment`

### 数据集依赖与下载逻辑
- **需要本地已下载数据集**。
- 无自动下载；仅从 config 指定路径读取。

---

## C. `bin/run_regularization.py`

### 入口与参数
- 入口：`python bin/run_regularization.py <config_file> [--beta] [--seed]`
- 参数：
  - `config_file`（必填）
  - `--beta`（默认 `0.0`）
  - `--seed`（默认 `42`）

### 真实调用链
1. `bin/run_regularization.py`
2. `src.experiments.disentanglement.RegularizationExperiment`
3. `src/experiments/disentanglement/regularization.py`
4. 继承 `AlignmentExperiment` -> `DisentanglementExperiment`
5. 在 `calc_loss()` 中：`contrastive_loss + beta * alignment_loss`
6. 依赖同 `run_alignment.py`（datasets / encoders / helpers / alignment metrics）

### 读取哪个 config
- 读取路径：`configs/disentanglement/<config_file>.yaml`

### config 关键字段
- 同 toy 线通用字段：`data.*`、`encoder1/2.*`、`training.*`
- 额外实验参数 `beta` 来自命令行，不在 config 中固定

### 最终输出保存位置
- 基目录：`results/<config_file>/`
- 模型：`results/<config_file>/models/epoch_*.pt`
- 指标：`wandb` project=`regularization`

### 数据集依赖与下载逻辑
- **依赖预下载数据**，无自动下载。

---

## 3) “最小可运行命令”列表

> 默认 seed 都是 `42`（可不写）。  
> 需在 `multimodal_ib` 仓库根目录执行。

1. `remove_msi`（示例：dSprites 缺失一个因子）
```bash
python bin/remove_msi.py dsprites shape
```

2. `run_alignment`
```bash
python bin/run_alignment.py dsprites
```

3. `run_regularization`（最小参数，默认 `beta=0.0`）
```bash
python bin/run_regularization.py dsprites
```

### 运行前数据准备（必须）
1. 下载/放置 toy 数据到本机（dSprites / MPI3D / Shapes3D）。
2. 打开对应配置文件（如 `configs/disentanglement/dsprites.yaml`）。
3. 把 `data.filepath` 改为你机器上的真实绝对路径。
4. 确认该路径文件可读（`.npz` 或 `.h5`）。

---

## 4) 可能踩坑点（高频）

1. **`config_file` 不带 `.yaml`**  
   代码会自动拼接后缀；命令应传 `dsprites` 而不是 `dsprites.yaml`。

2. **README 示例命令省略了 `bin/`**  
   实际入口文件在 `bin/` 目录，建议显式写 `python bin/...`。

3. **数据路径是作者机器绝对路径**  
   不改 `data.filepath` 会直接找不到文件。

4. **没有自动下载数据逻辑**  
   `datasets.py` 只读取本地文件，不负责下载。

5. **结果目录按 `config_file` 命名**  
   不同脚本若用同一个 config，会共用 `results/<config_file>/models`，可能互相覆盖 checkpoint。

6. **wandb 默认在线记录**  
   需要可用网络与 wandb key（脚本里硬编码传入 key）；离线环境可能导致日志问题。

7. **`run_regularization` 默认 `beta=0.0`**  
   若不显式传 `--beta`，效果等价于不加正则。

8. **`remove_msi` 的 `missing_factor` 必须是该数据集合法因子名**  
   名字不匹配会在数据集构造阶段失败（例如 dSprites 用 `shape/scale/orientation/posX/posY`）。


import { spawn } from 'child_process';
import path from 'path';

export function runHelloPython(pythonPath: string, scriptArg: string): Promise<string> {
    return new Promise((resolve, reject) => {
        // 🛠 Correct script path based on Python path
        const basePath = path.resolve(path.dirname(pythonPath), '..', '..'); // goes from bin/ → venv/ → python/
        const scriptPath = path.join(basePath, 'morphy.py');

        console.log('🐍 Running:', pythonPath, scriptPath);

        const py = spawn(pythonPath, [scriptPath, scriptArg]);

        let result = '';
        let error = '';

        py.stdout.on('data', (data) => (result += data.toString()));
        py.stderr.on('data', (data) => (error += data.toString()));

        py.on('close', (code) => {
            if (code === 0) resolve(result.trim());
            else reject(new Error(`Python script failed [code ${code}]: ${error}`));
        });

        py.on('error', (err) => reject(err));
    });
}

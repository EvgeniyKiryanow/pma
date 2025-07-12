import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export function runHelloPython(arg: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, 'assets/python/morphy.py');

        console.log('🐍 Script path:', scriptPath);

        if (!fs.existsSync(scriptPath)) {
            return reject(new Error(`❌ Python script not found at ${scriptPath}`));
        }

        const py = spawn('python3', [scriptPath, arg]);

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

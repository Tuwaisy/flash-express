import React, { useState } from 'react';

interface CalculatorInputs {
    weight: number;
    distance: number;
    priority: 'Standard' | 'Express' | 'Urgent';
    packageType: 'Small' | 'Medium' | 'Large';
}

const ShippingCalculator = () => {
    const [inputs, setInputs] = useState<CalculatorInputs>({
        weight: 0,
        distance: 0,
        priority: 'Standard',
        packageType: 'Small'
    });

    const [result, setResult] = useState<number | null>(null);

    const calculateCost = () => {
        // Base rates
        const baseRates = {
            Small: 30,
            Medium: 45,
            Large: 60
        };

        // Priority multipliers
        const priorityMultipliers = {
            Standard: 1,
            Express: 1.5,
            Urgent: 2
        };

        // Distance cost (per km)
        const distanceCost = 0.5;

        // Weight cost (per kg)
        const weightCost = 2;

        const total = (
            baseRates[inputs.packageType] +
            (inputs.distance * distanceCost) +
            (inputs.weight * weightCost)
        ) * priorityMultipliers[inputs.priority];

        setResult(total);
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6">Shipping Cost Calculator</h2>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Package Weight (kg)</label>
                    <input
                        type="number"
                        min="0"
                        className="w-full p-2 border rounded"
                        value={inputs.weight}
                        onChange={(e) => setInputs({ ...inputs, weight: parseFloat(e.target.value) || 0 })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Distance (km)</label>
                    <input
                        type="number"
                        min="0"
                        className="w-full p-2 border rounded"
                        value={inputs.distance}
                        onChange={(e) => setInputs({ ...inputs, distance: parseFloat(e.target.value) || 0 })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Priority Level</label>
                    <select
                        className="w-full p-2 border rounded"
                        value={inputs.priority}
                        onChange={(e) => setInputs({ ...inputs, priority: e.target.value as any })}
                    >
                        <option value="Standard">Standard</option>
                        <option value="Express">Express</option>
                        <option value="Urgent">Urgent</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Package Size</label>
                    <select
                        className="w-full p-2 border rounded"
                        value={inputs.packageType}
                        onChange={(e) => setInputs({ ...inputs, packageType: e.target.value as any })}
                    >
                        <option value="Small">Small</option>
                        <option value="Medium">Medium</option>
                        <option value="Large">Large</option>
                    </select>
                </div>

                <button
                    onClick={calculateCost}
                    className="w-full bg-primary text-primary-foreground py-2 px-4 rounded hover:bg-primary/90 transition"
                >
                    Calculate Cost
                </button>

                {result !== null && (
                    <div className="mt-6 p-4 bg-background rounded-lg">
                        <h3 className="text-lg font-semibold">Estimated Cost</h3>
                        <p className="text-2xl font-bold text-primary">{result.toFixed(2)} EGP</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            * This is an estimate. Final cost may vary based on additional factors.
                        </p>
                        <button className="mt-4 w-full bg-primary text-primary-foreground py-2 px-4 rounded hover:bg-primary/90 transition">
                            Get Detailed Quote
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShippingCalculator;
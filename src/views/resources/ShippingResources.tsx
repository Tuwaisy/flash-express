import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ShippingCalculator from './ShippingCalculator';

interface Resource {
    title: string;
    type: string;
    keyword: string;
    outline: string[];
    cta: string;
}

const shippingResources: Resource[] = [
    {
        title: "How Shipping Costs Work: A Complete Guide for Small Businesses",
        type: "Guide",
        keyword: "how shipping costs are calculated",
        outline: [
            "Base rate components (weight, distance, service level)",
            "Hidden fees and surcharges to watch for",
            "Impact of packaging choices on final costs",
            "Interactive cost breakdown examples"
        ],
        cta: "Download Calculator Spreadsheet"
    },
    {
        title: "7 Proven Ways to Reduce Your Business Shipping Costs",
        type: "Guide",
        keyword: "reduce shipping costs",
        outline: [
            "Bulk shipping discounts explained",
            "Strategic packaging optimization",
            "Zone skipping strategies",
            "Carrier negotiation tips"
        ],
        cta: "Get Cost Analysis"
    },
    {
        title: "Business Shipping Cost Comparison: Top 5 Courier Services",
        type: "Comparison",
        keyword: "affordable courier services",
        outline: [
            "Side-by-side rate comparison",
            "Service level differences",
            "Hidden fee analysis",
            "Best use cases for each service"
        ],
        cta: "Compare Services"
    },
    {
        title: "Real Business Shipping Costs: E-commerce Case Studies",
        type: "Case Study",
        keyword: "cheap business shipping",
        outline: [
            "Real cost breakdowns from 3 businesses",
            "Before/after optimization results",
            "ROI calculations",
            "Implementation strategies"
        ],
        cta: "Schedule Consultation"
    },
    {
        title: "Shipping Cost Calculator: Compare Rates Instantly",
        type: "Tutorial",
        keyword: "calculate shipping cost",
        outline: [
            "Step-by-step cost calculation guide",
            "Interactive calculator tool",
            "Rate optimization suggestions",
            "Bulk quote generator"
        ],
        cta: "Calculate Now"
    }
];

const ShippingResources: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState('all');
    const [showCalculator, setShowCalculator] = useState(false);

    const filteredResources = shippingResources.filter(resource => {
        const matchesSearch = 
            resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            resource.keyword.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesType = selectedType === 'all' || resource.type.includes(selectedType);
        
        return matchesSearch && matchesType;
    });

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Shipping Resources</h1>
                <button
                    onClick={() => setShowCalculator(!showCalculator)}
                    className="btn-primary"
                    type="button"
                >
                    {showCalculator ? 'View Resources' : 'Open Calculator'}
                </button>
            </div>

            {showCalculator ? (
                <ShippingCalculator />
            ) : (
                <>
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <input
                            type="text"
                            placeholder="Search resources..."
                            className="flex-1 p-2 border rounded"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <select
                            className="p-2 border rounded"
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                        >
                            <option value="all">All Types</option>
                            <option value="Guide">Guides</option>
                            <option value="Case Study">Case Studies</option>
                            <option value="Tutorial">Tutorials</option>
                            <option value="Comparison">Comparisons</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredResources.map((resource, index) => (
                            <div key={index} className="card p-6 bg-white shadow-lg rounded-lg">
                                <h2 className="text-xl font-semibold mb-4">{resource.title}</h2>
                                <p className="text-sm text-gray-600 mb-2">{resource.type}</p>
                                <div className="mb-4">
                                    <h3 className="font-medium mb-2">Key Points:</h3>
                                    <ul className="list-disc pl-5">
                                        {resource.outline.map((point, i) => (
                                            <li key={i} className="text-sm text-gray-700 mb-1">{point}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="space-y-2">
                                    <Link 
                                        to={`/resources/shipping/${resource.keyword.toLowerCase().replace(/\\s+/g, '-')}`}
                                        className="btn-secondary w-full block text-center"
                                    >
                                        Read More
                                    </Link>
                                    <button 
                                        type="button"
                                        className="btn-primary w-full"
                                        onClick={() => {}}
                                    >
                                        {resource.cta}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default ShippingResources;
import React from 'react';
import { useParams } from 'react-router-dom';

const resourceContent = {
    'how-shipping-costs-work': {
        title: "How Shipping Costs Work: A Complete Guide for Small Businesses",
        content: `
            <h1>Understanding Shipping Costs for Your Business</h1>
            
            <section>
                <h2>Base Rate Components</h2>
                <p>Shipping costs are determined by three primary factors:</p>
                <ul>
                    <li>Weight of the package</li>
                    <li>Distance to destination</li>
                    <li>Service level selected</li>
                </ul>
                <p>Understanding these components helps you make informed decisions about your shipping strategy.</p>
            </section>

            <section>
                <h2>Hidden Fees and Surcharges</h2>
                <p>Be aware of additional costs that can impact your shipping expenses:</p>
                <ul>
                    <li>Fuel surcharges</li>
                    <li>Peak season adjustments</li>
                    <li>Rural delivery fees</li>
                    <li>Saturday delivery charges</li>
                </ul>
            </section>

            <section>
                <h2>Packaging Impact</h2>
                <p>Your choice of packaging directly affects shipping costs through:</p>
                <ul>
                    <li>Dimensional weight calculations</li>
                    <li>Material costs</li>
                    <li>Special handling requirements</li>
                </ul>
            </section>
        `
    },
    'reduce-shipping-costs': {
        title: "7 Proven Ways to Reduce Your Business Shipping Costs",
        content: `
            <h1>Cut Your Shipping Expenses</h1>

            <section>
                <h2>1. Optimize Your Packaging</h2>
                <p>Right-sized packaging can significantly reduce your shipping costs by:</p>
                <ul>
                    <li>Minimizing dimensional weight charges</li>
                    <li>Reducing material costs</li>
                    <li>Improving shipping efficiency</li>
                </ul>
            </section>

            <section>
                <h2>2. Negotiate with Carriers</h2>
                <p>Learn how to effectively negotiate shipping rates:</p>
                <ul>
                    <li>Volume discounts</li>
                    <li>Service level agreements</li>
                    <li>Custom rate cards</li>
                </ul>
            </section>

            <section>
                <h2>3. Use Multiple Carriers</h2>
                <p>Diversify your shipping strategy by:</p>
                <ul>
                    <li>Comparing rates for different routes</li>
                    <li>Leveraging carrier strengths</li>
                    <li>Maintaining backup options</li>
                </ul>
            </section>
        `
    },
    // Add more resource content here
};

const ResourceDetail = () => {
    const { slug } = useParams();
    const resource = resourceContent[slug as keyof typeof resourceContent];

    if (!resource) {
        return <div>Resource not found</div>;
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="prose prose-lg">
                <div dangerouslySetInnerHTML={{ __html: resource.content }} />
            </div>
            
            <div className="mt-8 p-6 bg-background rounded-lg shadow">
                <h3 className="text-xl font-bold mb-4">Ready to Optimize Your Shipping?</h3>
                <p className="mb-4">Get a personalized analysis of your shipping costs and find out how much you could save.</p>
                <button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition">
                    Get Your Free Analysis
                </button>
            </div>
        </div>
    );
};

export default ResourceDetail;
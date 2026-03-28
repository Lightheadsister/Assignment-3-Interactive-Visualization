# Assignment-3-Interactive-Visualization
CSC316 Assignment 3: Interactive Visualization

Open index.html using Live Server.


add

Assignment 3: Interactive Visualization
Background
For this assignment, you will use the D3 skills you’ve gained over the semester to individually implement an interactive and animated visualization. You will build a visualization that enables interactive exploration or storytelling of a dataset of your own choosing and deploy it on the web.
This assignment has two goals: (1) we want to assess your ability to implement interaction and animation techniques for visualizations individually; and (2) we want you to think carefully about the effectiveness of specific interaction and animation techniques for your chosen data domain. For example, the zipdecode and NameGrapher applications apply the interactive technique of dynamic queries – first explored in the HomeFinder application – to the problem of uncovering patterns in zip codes and baby names. Similarly, interaction and animation techniques have also been very effectively used for explorable explanations, including Kernel Density Estimation (KDE) and machine learning concepts.
A critical challenge will be scoping the assignment such that you can complete it within approximately 2-3 weeks (any more time than this should ideally be spent working on your final projects). Focus on designing a limited yet compelling visualization that enables interactive exploration along a few critical dimensions, and then layer on additional complexity. The NameGrapher application is a nice example that uses a simple but elegant interaction design to enable engaging explorations. A tightly-focused, well-implemented interactive graphic is much preferred to a sprawling design that attempts too much!

Your Tasks
Design an interactive graphic (with any necessary animation techniques) to explore or understand a compelling question for a dataset of your own choosing. If you wish, you may use your dataset from A1, although you may need to add in synthetic data in order to have a dataset large enough to warrant interactive visualization (you can consider using an LLM to help you generate synthetic data).
In order to determine what subset of the data and which interactive options are most promising, we encourage you to perform additional exploratory analysis. What aspects of the data reveal the most interesting discoveries or stories? Do not feel obligated to try to convey everything about the data: focus on a compelling subset.
Your graphic must include interactions and animations that enable exploration or storytelling. Possible techniques include panning, zooming, brushing, details-on-demand (e.g., tooltips), dynamic query filters, and selecting different measures to display. You are free to also consider highlights, annotations, or other narrative features intended to draw attention to particular items of interest and provide additional context.
Implement your graphic in D3.js and deploy it to the web. You may use plug-ins for JS and D3 provided your graphic does not require customized server-side support; you should simply load data from a static data file or public web API.
You should use GitHub pages to host your visualization from your project repository. We recommend keeping everything (development files and website) in your main branch: either serve your website from the root folder or from the /docs folder. Your repo must also contain the (unobfuscated) source code for your visualization.
After you have implemented and deployed your interactive visualization, you will complete a write-up with the following components:
A rationale for your design decisions. How did you choose your particular visual encodings, interaction, and animation techniques? What alternatives did you consider and how did you arrive at your ultimate choices?
An overview of your development process. Describe your working process, including the use of LLMs in helping you write D3 code (if you choose to use them). For the commentary on the development process, consider including answers to the following questions: Roughly how much time did you spend developing your application (in people-hours)? If you used an LLM, did you feel like you were comfortable coding like this? What aspects took the most time?
Remember to acknowledge all appropriate sources not just in your write-up but also directly on your visualization itself (including the source of your data, and any example visualization you drew inspiration from). The write-up should be no longer than two pages long (you are free to use your own spacing and font size conventions, but please be reasonable).


here is the grading :
Grading
Your grade in this assignment will be broken down into twocomponents:
The Visualization
The visualization is scored out of 15 points. Visualizations that squarely meet the requirements for the assignment will receive a score of 12 out of 15. Going beyond the call of duty can net additional points, for example:
* advanced interaction or animation techniques
* novel visualization elements
* effective multi-view coordination
* thoughtful and elegant graphic design
* insightful & engaging exploration or narrative experience
*
Point deductions will be made when projects suffer from:
* errors or broken features
* clearly ineffective visual encodings
* lack of exploratory or narrative interaction or animation techniques
* overly simplistic or distracting interaction or animation techniques
* confusing interface design
* incomplete or insufficient write-up

This is my assignment and my code, can you improve my code and make some great D3 interaction? 
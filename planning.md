# Seattle Theatre Site -- Planning

Whenever moving forward on the project gets involved enough that I need to step back and create specific plans and strategies in order to proceed, I will use this document to try to get my ideas clear.

## Current Issues

1. I would like to pull out popup functionality to centralize it, but a couple things concern me:
   - Where should popups be instantiated? (Thoughts: wherever they would otherwise be injected, for example, somewhere near the root of the application.)
   - How should popups be shown? (Thoughts: send a message via an event emitter.)
   - How should popups be shown such that before they are show initial data requirements are satisfied? (Thoughts: an event object can pass initial state to the popup which can use it to twittle both the react component and the relay containers variables).
   - How can a central popup component know about the data fetching state of its specific popup code so that it can display a spinner while data is loading, or simply not show until data exists?
2. I would like to be able to ask for arbitrary nodes by global id at any point in the component heirarchy. Is this a good idea?
